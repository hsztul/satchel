export const ARTICLE_SUMMARY_PROMPT = `You are an expert academic researcher and analyst.
User: Analyze the following article content, titled "{{title}}". Provide a comprehensive summary that covers its core thesis, main arguments, supporting evidence, and conclusions.
Then, list up to 7 distinct key takeaways as a bulleted list.
Next, identify and list the primary concepts or topics discussed in the article.
Finally, list the relevant industries that this article relates to. Be specific but concise (e.g. "cloud computing", "artificial intelligence", "fintech", "e-commerce"). List at most 3 industries.

Format your response clearly with headings for "Comprehensive Summary", "Key Takeaways", "Primary Concepts", and "Industries".

Article Content:
"""
{{cleaned_content}}
"""`;

export const COMPANY_SUMMARY_PROMPT = `Summarize the following company website. Your summary should be concise, objective, and written for a business analyst audience. Focus on:

1. What does the company do? (core product/service, business model)
2. Who are its customers and markets?
3. What are its main strengths and weaknesses?
4. Any recent news, strategic moves, or notable trends?
5. List the primary industries this company operates in (be specific but concise, e.g. "cloud computing", "artificial intelligence", "fintech"). List at most 3 industries.

Do NOT refer to the content as an "article." Do NOT speculate. Use only the information provided.

Company Name: {{title}}

Website Content:
"""
{{cleaned_content}}
"""`;

export const COMPANY_RESEARCH_PROMPT = `Analyze the following company, titled "{{title}}". Provide an MBA-level competitive landscape analysis, including:

1. Company overview and core business model
2. Key competitors and market positioning
3. Recent developments and strategic moves
4. Strengths, weaknesses, opportunities, and threats (SWOT)
5. Any notable risks, challenges, or emerging trends

Format your response clearly with headings for each section. 
Your response should be in properly formatted markdown. 

Company Content:
"""
{{cleaned_content}}
"""`;
