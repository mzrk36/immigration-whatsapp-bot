const https = require('https');
const fs = require('fs');

const mermaidCode = `graph TD
    User([User WhatsApp]) -->|Sends Message| OpenWA[OpenWA API Server]
    OpenWA -->|POST Request| Webhook[Node.js Express /webhook]
    
    Webhook --> Deduplication{2-Second Deduplication Lock}
    Deduplication -->|Duplicate Message| Drop[Ignore Message]
    Deduplication -->|Unique Message| StateCheck{Check Current Chat Mode}

    StateCheck -->|Mode: WAITING| InterceptWaiting[Intercept: Do Not Auto-Reply]
    StateCheck -->|Mode: HUMAN| InterceptHuman[Intercept: Do Not Auto-Reply]
    StateCheck -->|Mode: AI| CommandCheck{Check User Command}

    CommandCheck -->|Sends '0' or 'Main Menu'| ResetState[Reset Session to MAIN_MENU]
    CommandCheck -->|Handoff Keyword / Menu Option 7| SetWaiting[Set Mode to WAITING]
    
    SetWaiting --> NotifyOwner1[Send WhatsApp Alert to Owner]
    SetWaiting --> NotifyOwner2[Send Direct Dashboard Link]
    
    CommandCheck -->|Other Inputs| FlowCheck{Check Current Flow State}
    FlowCheck -->|In Lead Form| LeadForm[Ask Next Application Question]
    LeadForm -->|Form Complete| GoogleSheets[(Google Sheets Leads)]
    
    FlowCheck -->|In Navigation Menu| NumericCheck{Is Input a Number?}
    NumericCheck -->|Valid Number| Navigate[Navigate to Sub-Menu]
    Navigate -->|Option: Apply| LeadForm
    
    NumericCheck -->|Not a Number| MistralAI[Trigger AI Fallback]
    MistralAI --> GenerateReply[Generate Friendly AI Response]

    Dashboard([Owner Control Dashboard]) -->|View Live Chats| DashAPI[Dashboard Express API]
    Dashboard -->|Toggle Mode AI/HUMAN| UpdateState[Update Chat Mode]
    Dashboard -->|Send Reply| SendMsg[Send Text]
    SendMsg --> OpenWA
    
    GenerateReply --> SendFinal[Send Text]
    Navigate --> SendFinal
    ResetState --> SendFinal
    LeadForm --> SendFinal
    SendFinal --> OpenWA
    OpenWA -->|Delivers Message| User`;

// Base64 encode the code
const encoded = Buffer.from(mermaidCode).toString('base64');
const url = `https://mermaid.ink/img/${encoded}`;

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error('Failed to download image: ' + res.statusCode);
        return;
    }
    
    const file = fs.createWriteStream('Bot_Architecture_Roadmap.jpg');
    res.pipe(file);
    
    file.on('finish', () => {
        file.close();
        console.log('Image successfully saved to Bot_Architecture_Roadmap.jpg');
    });
}).on('error', (err) => {
    console.error('Error downloading image: ', err.message);
});
