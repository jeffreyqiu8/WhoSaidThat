/**
 * Prompt data and selection logic for the Who Said That Game
 */

/**
 * Array of prompts for the game
 * Each prompt is a question or statement that players respond to
 */
export const PROMPTS: string[] = [
  "What's your most embarrassing moment from high school?",
  "If you could have dinner with any historical figure, who would it be?",
  "What's the weirdest food combination you secretly enjoy?",
  "What's your go-to karaoke song?",
  "If you could live in any fictional universe, which would you choose?",
  "What's the most ridiculous thing you've ever bought?",
  "What's your most unpopular opinion?",
  "If you could instantly master any skill, what would it be?",
  "What's the worst haircut you've ever had?",
  "What's your guilty pleasure TV show or movie?",
  "If you could swap lives with anyone for a day, who would it be?",
  "What's the strangest dream you've ever had?",
  "What's your most irrational fear?",
  "If you could only eat one food for the rest of your life, what would it be?",
  "What's the most trouble you got into as a kid?",
  "What's your secret talent that nobody knows about?",
  "If you could time travel, would you go to the past or future?",
  "What's the worst date you've ever been on?",
  "What's your most used emoji?",
  "If you were a superhero, what would your power be?",
  "What's the most embarrassing thing in your search history?",
  "What's your biggest pet peeve?",
  "If you could be famous for something, what would it be?",
  "What's the weirdest habit you have?",
  "What's your favorite conspiracy theory?",
  "If you could eliminate one thing from daily life, what would it be?",
  "What's the most spontaneous thing you've ever done?",
  "What's your comfort food?",
  "If you could have any animal as a pet, what would you choose?",
  "What's the worst gift you've ever received?",
  "What's your most controversial hot take?",
  "If you could live anywhere in the world, where would it be?",
  "What's the most embarrassing thing you've done while drunk?",
  "What's your biggest regret?",
  "If you could redo one moment in your life, what would it be?",
  "What's the strangest thing you believed as a child?",
  "What's your worst fashion choice?",
  "If you could have dinner with your 15-year-old self, what would you say?",
  "What's the most awkward text you've ever sent?",
  "What's your hidden talent?",
  "If you could be any age forever, what age would you choose?",
  "What's the most embarrassing song on your playlist?",
  "What's your biggest fear about the future?",
  "If you could change one thing about yourself, what would it be?",
  "What's the weirdest compliment you've ever received?",
  "What's your most embarrassing childhood memory?",
  "If you could have any job for a day, what would it be?",
  "What's the most ridiculous lie you've ever told?",
  "What's your biggest 'what if' in life?",
  "If you could uninvent one thing, what would it be?",
  "What's the most cringe thing you've ever posted on social media?",
  "What's your most embarrassing autocorrect fail?",
  "If you could read minds for a day, whose mind would you read?",
  "What's the worst advice you've ever received?",
  "What's your most irrational purchase?",
  "If you could have any fictional character as your best friend, who would it be?",
  "What's the most embarrassing thing your parents have done?",
  "What's your biggest kitchen disaster?",
  "If you could erase one memory, what would it be?",
  "What's the most awkward encounter you've had with a celebrity or crush?",
];

/**
 * Selects a random prompt that hasn't been used in the current game
 * @param usedPrompts - Array of prompts already used in this game session
 * @returns A random unused prompt, or a random prompt if all have been used
 */
export function selectRandomPrompt(usedPrompts: string[] = []): string {
  // Filter out used prompts
  const availablePrompts = PROMPTS.filter(prompt => !usedPrompts.includes(prompt));
  
  // If all prompts have been used, reset and use all prompts
  const promptPool = availablePrompts.length > 0 ? availablePrompts : PROMPTS;
  
  // Select random prompt from available pool
  const randomIndex = Math.floor(Math.random() * promptPool.length);
  return promptPool[randomIndex];
}
