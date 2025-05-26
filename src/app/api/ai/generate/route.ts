import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI with the API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fallback content for different categories and types
const fallbackContent = {
  title: {
    tech: "Tech Innovation Summit 2023",
    business: "Business Growth & Networking Conference",
    arts: "Creative Arts Festival",
    sports: "Championship Sports Tournament",
    health: "Wellness & Health Expo",
    education: "Educational Leadership Symposium",
    social: "Community Gathering & Celebration",
    other: "Special Event Experience"
  },
  shortDescription: {
    tech: "Join industry leaders for the latest in tech innovation and cutting-edge developments.",
    business: "Connect with professionals and learn strategies to accelerate your business growth.",
    arts: "Experience creative expression through various art forms in this immersive festival.",
    sports: "Witness top athletes compete in an exciting championship tournament.",
    health: "Discover holistic approaches to improve your wellbeing and health.",
    education: "Explore new teaching methodologies and educational leadership principles.",
    social: "Build meaningful connections in this engaging community celebration.",
    other: "A unique event experience crafted to inspire and engage participants."
  },
  description: {
    tech: "Join us for an immersive day of technology exploration and innovation. This event brings together industry experts, thought leaders, and tech enthusiasts to discuss the latest trends and breakthroughs. You'll have the opportunity to participate in hands-on workshops, witness live demonstrations of cutting-edge products, and network with professionals across the tech ecosystem. Whether you're interested in AI, blockchain, cybersecurity, or digital transformation, there's something for everyone. Don't miss this chance to stay ahead of the curve and be part of shaping the future of technology.",
    business: "Elevate your business acumen at our comprehensive conference designed for professionals at all levels. This event features keynote speeches from industry leaders, interactive workshops on growth strategies, and valuable networking opportunities. You'll gain insights into market trends, discover new approaches to common challenges, and connect with potential partners and clients. Sessions cover a range of topics including leadership, marketing, finance, and operational excellence. Leave equipped with actionable strategies to implement in your organization and a network of valuable contacts to support your business journey.",
    arts: "Immerse yourself in a celebration of creativity and artistic expression. Our festival showcases diverse art forms including visual arts, music, dance, theater, and digital media. Experience captivating performances, browse exhibitions featuring both established and emerging artists, and participate in interactive workshops to unleash your own creativity. This event creates a space where artists and art enthusiasts can connect, inspire, and be inspired. Join us for an unforgettable experience that highlights the power of art to transform perspectives and bring communities together.",
    sports: "Experience the thrill of competition at our premier sporting event. Watch as top athletes showcase their skills and push the boundaries of human performance. The tournament features multiple disciplines, exciting matchups, and the electric atmosphere that only live sports can deliver. Beyond the competitions, enjoy fan zones, meet-and-greets with sports personalities, and activities for all ages. Whether you're a dedicated sports enthusiast or simply enjoy the excitement of live events, this tournament offers entertainment and inspiration for everyone.",
    health: "Prioritize your wellbeing at our comprehensive health and wellness expo. This event brings together health professionals, fitness experts, nutritionists, and mindfulness practitioners to provide a holistic approach to healthy living. Explore interactive exhibits, participate in fitness demonstrations, attend informative talks, and discover new products and services to support your wellness journey. From practical health tips to transformative lifestyle changes, you'll leave with knowledge and tools to enhance your physical and mental wellbeing. Join us to invest in your most valuable asset—your health.",
    education: "Join educators and thought leaders at our educational symposium dedicated to innovation and excellence in learning. This event features keynote speeches, panel discussions, and workshops exploring the latest in educational theory and practice. Topics include innovative teaching methods, inclusive learning environments, educational technology, and leadership in educational institutions. Network with peers, share experiences, and gain insights that can be implemented in your classroom or institution. Whether you're a teacher, administrator, or education enthusiast, this symposium offers valuable perspectives to enhance the learning experience.",
    social: "Connect and celebrate with your community at our engaging social gathering. This event creates opportunities for meaningful interactions, shared experiences, and building relationships in a welcoming atmosphere. Enjoy entertainment, activities, and conversations designed to bring people together. From networking opportunities to simply enjoying the company of like-minded individuals, this gathering offers something for everyone. Join us to strengthen community bonds, make new connections, and create lasting memories in a positive and inclusive environment.",
    other: "Join us for a unique event experience carefully crafted to engage, inspire, and leave a lasting impression. This special gathering offers a blend of engaging activities, valuable content, and opportunities to connect with others. The thoughtfully designed program caters to diverse interests and creates a welcoming atmosphere for all participants. Whether you're attending for personal enrichment, professional development, or simply to enjoy a new experience, you'll find value in every moment. Don't miss this opportunity to be part of something extraordinary."
  }
};

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { category, type, additionalInfo } = body;

    if (!category || !type) {
      return NextResponse.json({ error: 'Category and type are required' }, { status: 400 });
    }

    // Validate type
    if (!['title', 'description', 'shortDescription'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be title, description, or shortDescription' }, { status: 400 });
    }

    // Build the prompt based on the requested type
    let prompt = '';
    let maxTokens = 0;

    if (type === 'title') {
      prompt = `Generate a catchy and professional title for a ${category} event.${additionalInfo ? ` The event involves: ${additionalInfo}` : ''}`;
      maxTokens = 30; // Short for titles
    } else if (type === 'shortDescription') {
      prompt = `Write a brief one-sentence description for a ${category} event that would appear in a listing or card.${additionalInfo ? ` The event involves: ${additionalInfo}` : ''}`;
      maxTokens = 100; // Short for brief descriptions
    } else {
      // Full description
      prompt = `Write an engaging and detailed description for a ${category} event. Include what attendees can expect and why they should attend.${additionalInfo ? ` The event involves: ${additionalInfo}` : ''}`;
      maxTokens = 300; // Longer for full descriptions
    }

    console.log(`Generating ${type} for ${category} event`);

    try {
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an event marketing specialist who creates compelling event content.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      // Extract the generated text
      const generatedText = response.choices[0]?.message?.content?.trim();

      if (!generatedText) {
        throw new Error('No text was generated');
      }

      // Return the generated text
      return NextResponse.json({ 
        text: generatedText,
        type
      });
    } catch (error) {
      console.error('OpenAI API error, using fallback content:', error);
      
      // Check if the error is related to API quota
      const isQuotaError = 
        error.message?.includes('429') || 
        error.message?.includes('quota') ||
        error.code === 'insufficient_quota';
      
      if (isQuotaError) {
        // Use fallback content based on category and type
        const safeCategory = (category in fallbackContent[type]) ? category : 'other';
        const fallbackText = fallbackContent[type][safeCategory];
        
        console.log(`Using fallback ${type} for ${category} event`);
        
        return NextResponse.json({
          text: fallbackText,
          type,
          isFromFallback: true
        });
      } else {
        // For other errors, throw them to be caught by the outer try-catch
        throw error;
      }
    }
  } catch (error) {
    console.error('AI generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 