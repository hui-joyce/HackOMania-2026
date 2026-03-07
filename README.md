# SentiCare AI

> By **d!st**
> - [Joyce](https://github.com/hui-joyce/)
> - [Claire](https://github.com/clacla17/)
> - [Qi Xuan](http://github.com/qixuaann/)
> - [Linn](http://github.com/linnxyz/)

| Platform                          | Description                                                                                                                    |
:---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------: |
| Youtube                           | [App Demo]()                                                                                       |
| Figma                             | [Wireframes](https://www.figma.com/design/zPl2JNVk7z7ADr7F4YyzSc/Team-D-ST--HackOMania-2026-?node-id=0-1&t=x9OaWUd1HabE3rIT-1)    |

Code submission for [Hackomania 2026](https://hackomania.geekshacking.com/)

## Problem Statement
**"How might we use AI to enhance the Personal Alert Button system so that hotline responders can more accurately understand the senior's situation, assess urgency, and allocate resources effectively?"**
> Seniors living alone can press the Personal Alert Button (PAB) to request help, sending a short audio message to a 24/7 hotline. However, operators must quickly assess the urgency of each alert from recordings that may be unclear, spoken in different dialects, or lacking critical information, making it difficult to prioritise emergencies and allocate resources effectively.

## Target Audience
- Dispatch Operators
- Households that own a Personal Alert Button (PAB)

## Core Features
***Audio Situation Detection***
> AI analyzes PAB recordings to transcribe speech, detect languages or dialects, and identify acoustic signals such as falls, breathing distress, or background sounds to better understand the senior’s situation.

***AI Emergency Summary Analysis***
> The system highlights key phrases, detected sounds, and distress indicators from recordings, generating a clear emergency summary with confidence scores and recommended next actions (e.g., ambulance, police, community responder, welfare check).

***Prioritised Alert Queue***
> Alerts are automatically triaged into non-urgent, uncertain, or urgent categories using AI-generated urgency and confidence scores, helping operators quickly focus on the most critical cases.

***Case Monitoring & AI Voice Follow-Up***
> Unresolved cases trigger notifications to ensure no alert is missed. For uncertain alerts, operators can activate an AI voice assistant to ask the senior simple questions and gather additional information while operators attend to higher-priority cases.

***Dashboard, Analytics & Audit***
> A centralized dashboard provides operators with live case monitoring, alert prioritization, system analytics, and audit logs to support efficient response management and transparency.


--
## **Technology Stack**

### Frontend
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

### Backend
- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

### AI & Audio Processing
- [Transformers.js](https://github.com/xenova/transformers.js) – Run machine learning models directly in JavaScript
- [Whisper (Xenova/whisper-base.en)](https://huggingface.co/Xenova/whisper-base.en) – Speech-to-text transcription
- [AST AudioSet Model (Xenova/ast-finetuned-audioset)](https://huggingface.co/Xenova/ast-finetuned-audioset-10-10-0.4593) – Audio classification for detecting environmental sounds
