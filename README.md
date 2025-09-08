# Pangea_IA: Decolonial AI Platform

**Pangea_IA** is a comprehensive decolonial artificial intelligence platform created by **Marlon Barrios Solano** and **Maria Luisa Angulo**. This groundbreaking project challenges dominant AI paradigms by integrating indigenous epistemologies, decolonial theory, and Global South perspectives into interactive voice agents and multimodal AI systems.

## 🌍 **About Pangea AI**

Pangea AI is a long-horizon artistic research and production platform that treats the ancient supercontinent Pangea as an epistemic metaphor: a world in motion, where borders are provisional and knowledge travels. The platform convenes artists, researchers, and technologists—especially across the Global South and North—to prototype decolonial strategies for AI: how we build with machine learning, how we narrate with data, and how we share tools, archives, and credit.

### **What Pangea AI Is**
- **A networked lab** for creation, training, and exhibition: residencies, workshops, and festivals that pair artists with open-source models, datasets, and lightweight toolchains
- **A methods library**: prompts, protocols, datasets, and code released openly, so works can be forked, remixed, and taught elsewhere
- **A publication track**: an evolving, open-access PDF/reader with commissioned essays and project notes that contextualize the work from critical, technical, and curatorial angles

### **Core Research Nodes**
1. **Speculative Cartographies & Post-Geographies** — maps that refuse center/periphery; migratory storytelling in latent space
2. **Artificial Ecologies & Chimeric Cognition** — multispecies, metabolic metaphors for model behavior; ethics beyond the individual
3. **Systems, Governance & Cybernetic Fictions** — from Project Cybersyn to contemporary platform power; performative simulations of governance
4. **Embodied Resistance & Cultural Memory** — dance, voice, and community archives (e.g., cumbia rebajada) as engines for training and re-narration
5. **Protocols, Archives & Latent Infrastructures** — how we version, discover, and maintain living archives and interactive knowledge bases

## 🎭 **Current Context: Pangea in Latent Space (Dortmund)**

This platform is being developed within the 2025 residency and exhibition cycle **"Pangea in Latent Space / The Tectonics of Otherness – Decolonizing the Digital"** at Beyond Gravity Festival, Theater im Depot in Dortmund (October 1-5, 2025). The program adapts the Pangea AI framework to explore local urban history and community through the lens of decolonial AI practices.

## 🤖 **Decolonial AI Agents**

### **1. Pangea_IA (Main Decolonial Consultant)**
An expert AI consultant on decolonial practices, deeply knowledgeable about:
- Decolonial theory and methodologies
- Indigenous knowledge systems and epistemologies
- Critiques of colonial structures in technology, education, and society
- Strategies for decolonizing AI and technology
- Latin American decolonial thought and Global South perspectives

### **2. Thermometer of Coloniality**
An analytical AI agent that measures and identifies colonial patterns in various contexts:
- Provides "temperature readings" of coloniality (1-10 scale)
- Analyzes educational institutions, technology systems, research methodologies
- Identifies colonial elements and suggests decolonial alternatives
- Based on Aníbal Quijano's coloniality of power matrix

### **3. Valladolid Dialogue Simulation**
A historical simulation of the 1550-1551 debate featuring three agents:
- **Bartolomé de las Casas**: Advocate for indigenous rights
- **Juan Ginés de Sepúlveda**: Defender of Spanish conquest
- **Moderator**: Council of theologians and jurists
- Connects historical colonialism debates to contemporary AI governance questions

## 🌐 **Advanced Features**

### **Multimodal Capabilities**
- **🎨 DALL-E Image Generation**: Create decolonial art, indigenous-inspired visuals, speculative cartographies
- **📷 Image Analysis**: GPT-4 Vision analysis from decolonial perspectives
- **🔍 Real-time Web Search**: Access current information about decolonial movements, research, and events
- **📤 Image Upload & Analysis**: Users can upload images for decolonial analysis
- **💾 Image Download**: Download generated and analyzed images with descriptive filenames

### **Multilingual Interface**
Support for 11 languages with cultural adaptation:
- **Español** (default) - South/Central American accents and terminology
- **English** - Decolonial perspective with accessible language
- **Français** - Francophone decolonial thought
- **Deutsch** - German critical theory traditions
- **Português** - Brazilian and Lusophone perspectives
- **Italiano** - Mediterranean contexts
- **中文** - Non-Western knowledge systems
- **日本語** - Asian epistemologies
- **العربية** - Arab and Islamic knowledge traditions
- **हिन्दी** - South Asian decolonial perspectives
- **Русский** - Post-Soviet contexts

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ and npm
- OpenAI API key with access to Realtime API, DALL-E 3, and GPT-4 Vision

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd pangea-ia

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=your_actual_api_key_here

# Start the development server
npm run dev

# Open in browser
open http://localhost:3000
```

### **Usage**
1. **Select Language**: Choose your preferred language from the top-right selector
2. **Choose Scenario**: Select one of the three decolonial AI agents
3. **Connect**: Click "Conectar" to start voice interaction
4. **Interact**: 
   - Speak naturally or type messages
   - Request image generation for visual concepts
   - Upload images for decolonial analysis
   - Ask about current events (agent will search the web automatically)
5. **Download**: Save generated or analyzed images with the download buttons

## 👥 **Creators**

### **Marlon Barrios Solano** (Venezuela-USA)
Interdisciplinary artist, creative technologist, and researcher working at the intersection of generative AI, performance, creative coding, and decolonial thought. With a background in dance, software engineering, and cognitive science, his work explores the entanglements of technology, memory, migration, and queer-tech ethics through experimental systems of performance, interaction, and machine learning.

**Current Positions:**
- Maker-in-Residence at the Center for Arts, Migration, and Entrepreneurship (CAME), University of Florida
- Founding member and researcher-in-residence at Lake Studios Berlin
- 2025 Beyond Gravity / Decolonizing the Digital Residency recipient at Theater Im Depot, Dortmund

**Major Current Work:** "Born in Latent Space" (2024-2029) - a five-year exploration into synthetic memory, machine dreaming, and recursive performance that treats AI outputs as speculative beings generating epistemic fictions.

**Website:** [marlonbarrios.github.io](https://marlonbarrios.github.io/)

### **Maria Luisa Angulo**
Collaborator and co-creator in this decolonial AI research, contributing critical perspectives on technology, culture, and decolonial methodologies.

## 🛠 **Technical Features**

### **Agent Capabilities**
- **Voice Interaction**: Real-time audio with OpenAI's voice models (sage, shimmer, alloy)
- **Tool Integration**: Agents can autonomously use image generation, analysis, and web search
- **Contextual Memory**: Maintains conversation context and cultural knowledge
- **Error Handling**: Robust fallback systems for all operations
- **Session Management**: Secure ephemeral key generation and connection handling

### **Image Processing**
- **Generation**: DALL-E 3 with decolonial style options
- **Analysis**: GPT-4 Vision with multiple analysis types (general, decolonial, artistic, technical, cultural)
- **Upload**: Drag-and-drop interface with validation (JPG, PNG, GIF, WebP, max 10MB)
- **Display**: Smart rendering with 200px width for uploads, scalable for generated images
- **Download**: Multiple fallback methods handling CORS restrictions

### **Web Search Integration**
- **DuckDuckGo API**: Privacy-focused search with no API key required
- **Fallback Methods**: Multiple search strategies for reliability
- **Structured Results**: Formatted responses with sources and links
- **Cultural Context**: Results filtered and analyzed through decolonial lens

## 📂 **Project Structure**

```
src/
├── app/
│   ├── agentConfigs/           # Agent definitions and scenarios
│   │   ├── decolonialConsultant/   # Main Pangea_IA agent
│   │   ├── thermometerColoniality/ # Coloniality measurement agent
│   │   └── valladolidDialogue/     # Historical debate simulation
│   ├── api/                    # Server-side endpoints
│   │   ├── session/               # OpenAI session management
│   │   ├── generate-image/        # DALL-E integration
│   │   ├── analyze-image/         # GPT-4 Vision integration
│   │   ├── web-search/            # Web search functionality
│   │   └── proxy-image/           # CORS proxy for image downloads
│   ├── components/             # React UI components
│   │   ├── Transcript.tsx         # Chat interface with multimedia
│   │   ├── Events.tsx             # Event logging and debugging
│   │   ├── BottomToolbar.tsx      # Connection and audio controls
│   │   └── CompactImageUpload.tsx # Image upload interface
│   ├── contexts/               # React context providers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility libraries
│   │   ├── imageGeneration.ts     # DALL-E tool definition
│   │   ├── imageAnalysis.ts       # GPT-4 Vision tool definition
│   │   ├── webSearch.ts           # Web search tool definition
│   │   └── downloadUtils.ts       # Image download utilities
│   └── App.tsx                 # Main application component
```

## 🌟 **Key Innovations**

### **Decolonial AI Architecture**
- **Epistemic Diversity**: Multiple knowledge systems integrated into AI responses
- **Cultural Adaptation**: Language-specific cultural references and perspectives
- **Power-Aware Design**: Explicit acknowledgment of colonial structures in technology
- **Community-Centered**: Focus on Global South perspectives and indigenous wisdom

### **Multimodal Decolonial Analysis**
- **Visual Decolonization**: Image analysis identifying colonial vs decolonial elements
- **Speculative Cartographies**: Alternative mapping and geographical representations
- **Cultural Memory**: Integration of embodied knowledge and community archives
- **Artificial Ecologies**: Multispecies, metabolic metaphors for AI behavior

### **Real-time Knowledge Integration**
- **Current Events**: Live web search for decolonial movements and research
- **Academic Updates**: Access to recent publications and scholarly work
- **Movement Tracking**: Current indigenous rights and social justice initiatives
- **Cross-referencing**: Multiple source validation for sensitive topics

## 🎯 **Use Cases**

### **Educational**
- **Decolonial Studies**: Interactive learning about decolonial theory and practice
- **AI Ethics**: Critical examination of AI systems from decolonial perspectives
- **Indigenous Knowledge**: Exploration of non-Western epistemologies and ways of knowing
- **Historical Analysis**: Understanding colonial patterns and their contemporary manifestations

### **Research**
- **Academic Support**: Current information on decolonial scholarship and movements
- **Cultural Analysis**: Measuring coloniality in institutions, practices, and systems
- **Visual Studies**: Decolonial analysis of images, art, and visual representations
- **Methodology Development**: Exploring decolonial research approaches and methods

### **Artistic**
- **Creative Collaboration**: AI as artistic collaborator for decolonial art projects
- **Visual Generation**: Creating indigenous-inspired and decolonial imagery
- **Performance Research**: Integration with live coding, dance, and embodied practices
- **Speculative Futures**: Imagining decolonial technological and social alternatives

## 🔬 **Technical Specifications**

### **API Integrations**
- **OpenAI Realtime API**: Real-time voice interaction with low latency
- **OpenAI DALL-E 3**: High-quality image generation with style controls
- **OpenAI GPT-4 Vision**: Advanced image analysis and interpretation
- **DuckDuckGo Search API**: Privacy-focused web search without API keys

### **Performance Optimizations**
- **Streaming Responses**: Real-time audio and text processing
- **Parallel Tool Calls**: Simultaneous execution of multiple AI functions
- **Lazy Loading**: Efficient component and resource loading
- **Error Recovery**: Comprehensive fallback systems for all operations

### **Security & Privacy**
- **Ephemeral Keys**: Secure, temporary authentication tokens
- **No Data Storage**: Conversations and images are not permanently stored
- **CORS Handling**: Secure cross-origin resource sharing
- **Input Validation**: Comprehensive validation for all user inputs

## 🌈 **Future Developments**

### **Planned Features**
- **More Indigenous Languages**: Quechua, Náhuatl, Guaraní support
- **Community Archives**: Integration with decolonial knowledge repositories
- **Collaborative Spaces**: Multi-user decolonial dialogue environments
- **Extended Modalities**: Video analysis and generation capabilities

### **Research Directions**
- **Embodied AI**: Integration with somatic and contemplative practices
- **Distributed Cognition**: Multi-agent decolonial knowledge systems
- **Living Archives**: Dynamic, community-maintained knowledge bases
- **Queer-Tech Ethics**: Exploration of non-binary, fluid AI identity systems

## 📄 **License & Attribution**

This project is part of the broader Pangea AI research platform. Please cite as:

```
Barrios Solano, M. & Angulo, M.L. (2025). Pangea_IA: Decolonial AI Platform. 
Pangea in Latent Space / Beyond Gravity Festival. Theater im Depot, Dortmund.
```

## 🤝 **Contributing**

This project welcomes contributions that align with decolonial values and practices. Please read our contribution guidelines and ensure your work:
- Respects indigenous knowledge systems and cultural protocols
- Challenges rather than reinforces colonial structures
- Centers Global South perspectives and experiences
- Maintains the project's commitment to open, accessible technology

## 📞 **Contact**

For questions, collaborations, or more information:
- **Website**: [marlonbarrios.github.io](https://marlonbarrios.github.io/)
- **Project**: Pangea in Latent Space - Beyond Gravity Festival 2025
- **Location**: Theater im Depot, Dortmund, Germany

---

*"Decolonizing the Digital" • Pangea_IA • A critical intervention in AI development through decolonial theory and practice*

**© 2025 Marlon Barrios Solano & Maria Luisa Angulo** | Beyond Gravity Festival | Theater Im Depot, Dortmund | Powered by OpenAI GPT-4o Realtime API
