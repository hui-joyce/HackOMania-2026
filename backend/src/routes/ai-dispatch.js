const express = require('express');
const { HfInference } = require('@huggingface/inference');
const router = express.Router();

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const hf = new HfInference(HF_API_KEY);

/**
 * POST /api/ai-dispatch/recommend
 * Generate AI-recommended dispatch resource allocation
 * 
 * Request Body:
 * {
 *   transcript: string,
 *   urgencyLevel: string,
 *   primaryConcern: string,
 *   acousticFindings: string[],
 *   detectedEmotion: string
 * }
 * 
 * Response:
 * {
 *   recommendations: string[], // Array of resource IDs: ['ambulance', 'police', 'community-responders', 'welfare-helpers']
 *   description: string // AI-generated incident description
 * }
 */
router.post('/recommend', async (req, res) => {
    try {
        const { 
            transcript, 
            urgencyLevel, 
            primaryConcern, 
            acousticFindings = [], 
            detectedEmotion 
        } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: 'Transcript is required' });
        }

        // Build context for AI analysis
        const acousticContext = acousticFindings.length > 0 
            ? `Acoustic findings: ${acousticFindings.join(', ')}. ` 
            : '';
        
        const emotionContext = detectedEmotion 
            ? `Detected emotion: ${detectedEmotion}. ` 
            : '';
        
        const urgencyContext = urgencyLevel 
            ? `Urgency level: ${urgencyLevel}. ` 
            : '';
        
        const concernContext = primaryConcern 
            ? `Primary concern: ${primaryConcern}. ` 
            : '';

        // Construct input for summarization model
        const inputText = `You are analyzing an emergency call. Based on the following, recommend which resources to dispatch (ambulance, police, community responders, welfare helpers):

Transcript: "${transcript}"
Urgency: ${urgencyLevel || 'unknown'}
Primary concern: ${primaryConcern || 'unspecified'}
Emotion detected: ${detectedEmotion || 'neutral'}
Acoustic findings: ${acousticFindings.join(', ') || 'none'}

Respond with just the resource names that are needed, separated by commas. Be brief and direct.`;

        console.log('[AI-Dispatch] Requesting recommendations for:', inputText.substring(0, 200) + '...');

        // Construct input for incident description - natural and concise
        const descriptionInput = `You are an emergency dispatcher writing a brief incident assessment. Based on this call information, write a concise 2-3 sentence description for first responders:

Transcript: "${transcript}"
Urgency level: ${urgencyLevel}
Primary concern: ${primaryConcern || 'unspecified'}
Caller emotion: ${detectedEmotion || 'neutral'}
Acoustic indicators: ${acousticFindings.join(', ') || 'none detected'}

Write in plain text (no formatting symbols or markdown). Include: (1) what happened, (2) key indicators observed, (3) caller's condition. Keep it professional but conversational, like a dispatcher briefing responders on the radio.`;

        // Try to call HuggingFace API using official SDK
        let recommendations, description, usingFallback = false;

        try {
            console.log('[AI-Dispatch] Calling HuggingFace router with chat completions...');
            
            // Use HuggingFace Router with OpenAI-compatible chat completions endpoint
            const apiUrl = 'https://router.huggingface.co/v1/chat/completions';
            const model = 'meta-llama/Meta-Llama-3-8B-Instruct';
            
            const [resourceResponse, descriptionResponse] = await Promise.all([
                fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${HF_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: 'You are a concise emergency dispatch AI assistant. Analyze calls and recommend resources briefly.' },
                            { role: 'user', content: inputText }
                        ],
                        max_tokens: 100,
                        temperature: 0.5,
                        stream: false
                    })
                }),
                fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${HF_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: 'You are an emergency dispatcher writing brief, clear incident summaries for first responders. Use plain text only, no formatting symbols.' },
                            { role: 'user', content: descriptionInput }
                        ],
                        max_tokens: 150,
                        temperature: 0.6,
                        stream: false
                    })
                })
            ]);
            
            if (!resourceResponse.ok) {
                const errorText = await resourceResponse.text();
                throw new Error(`HF Router error: ${resourceResponse.status} - ${errorText}`);
            }
            
            const resourceResult = await resourceResponse.json();
            const descriptionResult = descriptionResponse.ok ? await descriptionResponse.json() : null;
            
            console.log('[AI-Dispatch] ✅ HuggingFace Router API call successful!');
            console.log('[AI-Dispatch] Resource result:', JSON.stringify(resourceResult).substring(0, 200));

            // Parse the generated text from chat completion format
            const generatedText = resourceResult?.choices?.[0]?.message?.content || '';
            recommendations = parseRecommendationsFromSummary(generatedText, urgencyLevel, primaryConcern, acousticFindings);

            // Extract description from generated text
            description = descriptionResult?.choices?.[0]?.message?.content || 
                generateFallbackDescription(transcript, urgencyLevel, primaryConcern, acousticFindings, detectedEmotion);

        } catch (apiError) {
            console.log('[AI-Dispatch] HuggingFace API error:', apiError.message);
            if (apiError.message?.includes('loading')) {
                console.log('[AI-Dispatch] Model is loading, using fallback for now');
            }
            usingFallback = true;
            
            // Use intelligent rule-based AI analysis
            recommendations = getFallbackRecommendations(urgencyLevel, primaryConcern, acousticFindings);
            description = generateFallbackDescription(transcript, urgencyLevel, primaryConcern, acousticFindings, detectedEmotion);
        }

        console.log('[AI-Dispatch] Recommendations:', recommendations);
        console.log('[AI-Dispatch] Description:', description);

        res.json({ 
            recommendations, 
            description,
            fallback: usingFallback
        });

    } catch (error) {
        console.error('[AI-Dispatch] Error generating recommendations:', error);
        
        // Fallback to rule-based recommendations on error
        const { transcript, urgencyLevel, primaryConcern, acousticFindings = [], detectedEmotion } = req.body;
        res.json({ 
            recommendations: getFallbackRecommendations(urgencyLevel, primaryConcern, acousticFindings),
            description: generateFallbackDescription(transcript, urgencyLevel, primaryConcern, acousticFindings, detectedEmotion),
            fallback: true
        });
    }
});

/**
 * Parse recommendations from AI summary text
 */
function parseRecommendationsFromSummary(summary, urgencyLevel, primaryConcern, acousticFindings) {
    const recommendations = [];
    const lowerSummary = (summary || '').toLowerCase();
    
    // Check for keywords indicating each resource type
    const ambulanceKeywords = ['ambulance', 'medical', 'hospital', 'paramedic', 'emergency medical', 'cardiac', 'breathing', 'injury', 'fall', 'pain'];
    const policeKeywords = ['police', 'crime', 'threat', 'violence', 'assault', 'break', 'intrusion', 'security'];
    const communityKeywords = ['community', 'neighbor', 'local', 'volunteer', 'assistance', 'support'];
    const welfareKeywords = ['welfare', 'social', 'mental health', 'elderly', 'counseling', 'care', 'anxiety', 'distress'];
    
    // Check keywords in summary
    if (ambulanceKeywords.some(keyword => lowerSummary.includes(keyword))) {
        recommendations.push('ambulance');
    }
    if (policeKeywords.some(keyword => lowerSummary.includes(keyword))) {
        recommendations.push('police');
    }
    if (communityKeywords.some(keyword => lowerSummary.includes(keyword))) {
        recommendations.push('community-responders');
    }
    if (welfareKeywords.some(keyword => lowerSummary.includes(keyword))) {
        recommendations.push('welfare-helpers');
    }
    
    // If no matches, use fallback rules
    if (recommendations.length === 0) {
        return getFallbackRecommendations(urgencyLevel, primaryConcern, acousticFindings);
    }
    
    return recommendations;
}

/**
 * Fallback rule-based recommendations
 */
function getFallbackRecommendations(urgencyLevel, primaryConcern, acousticFindings) {
    const recommendations = [];
    const lowerConcern = (primaryConcern || '').toLowerCase();
    const findingsText = acousticFindings.join(' ').toLowerCase();
    
    // Rule-based logic
    if (urgencyLevel === 'URGENT') {
        recommendations.push('ambulance');
        
        // Check for medical keywords
        if (lowerConcern.includes('cardiac') || lowerConcern.includes('heart') || 
            lowerConcern.includes('breathing') || lowerConcern.includes('respiratory') ||
            lowerConcern.includes('fall') || lowerConcern.includes('injury')) {
            // Medical emergency - ambulance only (already added)
        }
        
        // Check for security keywords
        if (lowerConcern.includes('threat') || lowerConcern.includes('violence') || 
            lowerConcern.includes('break') || findingsText.includes('scream') ||
            findingsText.includes('glass break')) {
            recommendations.push('police');
        }
    } else if (urgencyLevel === 'UNCERTAIN') {
        // Add community responders and welfare for uncertain cases
        recommendations.push('community-responders');
        recommendations.push('welfare-helpers');
        
        // Add ambulance if medical concern detected
        if (lowerConcern.includes('medical') || lowerConcern.includes('health') ||
            lowerConcern.includes('pain') || findingsText.includes('cough')) {
            recommendations.push('ambulance');
        }
    } else {
        // NON-URGENT
        recommendations.push('community-responders');
        
        // Check for welfare needs
        if (lowerConcern.includes('anxiety') || lowerConcern.includes('distress') ||
            lowerConcern.includes('mental') || lowerConcern.includes('lonely') ||
            lowerConcern.includes('emotional')) {
            recommendations.push('welfare-helpers');
        }
    }
    
    // Ensure at least one recommendation
    if (recommendations.length === 0) {
        recommendations.push('community-responders');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
}

/**
 * Generate fallback incident description
 */
function generateFallbackDescription(transcript, urgencyLevel, primaryConcern, acousticFindings, detectedEmotion) {
    const findings = acousticFindings.length > 0 ? acousticFindings.slice(0, 3).join(', ') : 'background noise';
    const emotion = detectedEmotion ? detectedEmotion.toLowerCase() : 'distressed';
    
    // Extract context from transcript
    const transcriptLower = (transcript || '').toLowerCase();
    let contextualInfo = '';
    
    // Detect key phrases for context
    if (transcriptLower.includes('pain') || transcriptLower.includes('hurt')) {
        contextualInfo = 'Caller reports experiencing pain. ';
    } else if (transcriptLower.includes('fell') || transcriptLower.includes('fall')) {
        contextualInfo = 'Caller indicates a fall incident has occurred. ';
    } else if (transcriptLower.includes('breath') || transcriptLower.includes('breathing')) {
        contextualInfo = 'Caller experiencing breathing difficulties. ';
    } else if (transcriptLower.includes('help') || transcriptLower.includes('emergency')) {
        contextualInfo = 'Caller requesting immediate assistance. ';
    } else if (transcriptLower.includes('scared') || transcriptLower.includes('afraid')) {
        contextualInfo = 'Caller expresses fear and concern. ';
    }
    
    // Build comprehensive description based on urgency level
    if (urgencyLevel === 'URGENT') {
        const actionRequired = primaryConcern.toLowerCase().includes('cardiac') || primaryConcern.toLowerCase().includes('heart')
            ? 'ACLS protocols and cardiac monitoring should be prepared.'
            : primaryConcern.toLowerCase().includes('fall') || primaryConcern.toLowerCase().includes('injury')
            ? 'Trauma assessment and immobilization equipment should be ready.'
            : 'Immediate medical intervention required upon arrival.';
        
        return `AI voice analysis identified critical emergency: ${primaryConcern}. ${contextualInfo}Acoustic analysis detected ${findings}, with caller displaying ${emotion} emotional state. ${actionRequired} Rapid response essential.`;
    } else if (urgencyLevel === 'UNCERTAIN') {
        const assessment = primaryConcern.toLowerCase().includes('mental') || primaryConcern.toLowerCase().includes('anxiety')
            ? 'Mental health assessment and de-escalation techniques may be needed.'
            : primaryConcern.toLowerCase().includes('medical')
            ? 'On-site medical evaluation recommended to determine severity.'
            : 'Situation requires professional assessment to determine appropriate intervention level.';
        
        return `Call analysis indicates possible ${primaryConcern} situation. ${contextualInfo}Voice patterns show ${emotion} state, with acoustic indicators including ${findings}. ${assessment} Responders should approach prepared for potential escalation.`;
    } else {
        const approach = primaryConcern.toLowerCase().includes('welfare') || primaryConcern.toLowerCase().includes('social')
            ? 'Social support and welfare check appropriate. Non-emergency community resources may be beneficial.'
            : primaryConcern.toLowerCase().includes('routine') || primaryConcern.toLowerCase().includes('check')
            ? 'Routine wellness check indicated. Standard response protocols sufficient.'
            : 'Non-critical situation requiring community support and monitoring.';
        
        return `Non-urgent call received regarding ${primaryConcern}. ${contextualInfo}Caller exhibits ${emotion} emotional state. Acoustic patterns detected: ${findings}. ${approach} Follow-up care coordination recommended.`;
    }
}

module.exports = router;