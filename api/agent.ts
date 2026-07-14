import { cocktails } from '../src/data/cocktails.js'
import type { Alcohol, Cocktail, Mood, MoodTheme, Strength } from '../src/types.js'

declare const process: { env: Record<string, string | undefined> }

type AgentRequest = { message: string; mood?: Mood; moodTheme?: MoodTheme; availableAlcohols?: Alcohol[]; strength?: Strength }
type SearchInput = Pick<AgentRequest, 'mood' | 'moodTheme' | 'availableAlcohols' | 'strength'> & { query?: string }

const moods = new Set<Mood>(['Happy', 'Relaxed', 'Romantic', 'Party', 'Stressed', 'Tired'])
const alcohols = new Set<Alcohol>(['Vodka', 'Gin', 'Rum', 'Whiskey', 'Tequila', 'Brandy', 'Soju', 'Beer', 'Wine'])
const strengths = new Set<Strength>(['Light', 'Medium', 'Strong'])
const moodThemes = new Set<MoodTheme>(['golden-hour', 'flirt', 'soft-mood', 'after-dark', 'bold', 'escape', 'celebration', 'rainy-day', 'sweet-crush', 'chill'])

const searchTool = {
  type: 'function',
  function: {
    name: 'search_cocktails',
    description: 'Search the canonical cocktail catalog. Only cocktails returned by this tool may be recommended.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mood: { type: 'string', enum: ['Happy', 'Relaxed', 'Romantic', 'Party', 'Stressed', 'Tired'] },
        moodTheme: { type: 'string', enum: ['golden-hour', 'flirt', 'soft-mood', 'after-dark', 'bold', 'escape', 'celebration', 'rainy-day', 'sweet-crush', 'chill'] },
        availableAlcohols: { type: 'array', items: { type: 'string', enum: ['Vodka', 'Gin', 'Rum', 'Whiskey', 'Tequila', 'Brandy', 'Soju', 'Beer', 'Wine'] } },
        strength: { type: 'string', enum: ['Light', 'Medium', 'Strong'] },
        query: { type: 'string', maxLength: 200 },
      },
    },
  },
} as const

const koreanTerms: Record<string, string[]> = {
  Happy: ['happy', '행복', '기쁜', '밝은', '축하'],
  Relaxed: ['relaxed', '편안', '차분', '여유', '느긋'],
  Romantic: ['romantic', '로맨틱', '설레', '사랑', '달콤'],
  Party: ['party', '파티', '신나', '강렬', '에너지'],
  Stressed: ['stressed', '스트레스', '긴장', '진정', '휴식'],
  Tired: ['tired', '피곤', '지친', '느린', '위로'],
  Vodka: ['vodka', '보드카'], Gin: ['gin', '진'], Rum: ['rum', '럼'], Whiskey: ['whiskey', '위스키', '버번'],
  Tequila: ['tequila', '테킬라'], Brandy: ['brandy', '브랜디'], Soju: ['soju', '소주'], Beer: ['beer', '맥주'], Wine: ['wine', '와인'],
  Light: ['light', '가볍', '약한', '낮은 도수'], Medium: ['medium', '보통', '적당'], Strong: ['strong', '강한', '진한', '높은 도수'],
}

function normalize(value: string) { return value.toLowerCase().replace(/\s+/g, ' ').trim() }

function validateSearchInput(input: SearchInput): SearchInput {
  if (input.mood !== undefined && !moods.has(input.mood)) throw new Error('invalid mood')
  if (input.moodTheme !== undefined && !moodThemes.has(input.moodTheme)) throw new Error('invalid mood theme')
  if (input.strength !== undefined && !strengths.has(input.strength)) throw new Error('invalid strength')
  if (input.availableAlcohols !== undefined && (!Array.isArray(input.availableAlcohols) || input.availableAlcohols.some(alcohol => !alcohols.has(alcohol)))) throw new Error('invalid alcohol')
  if (input.query !== undefined && (typeof input.query !== 'string' || input.query.length > 200)) throw new Error('invalid query')
  return input
}

export function searchCocktails(input: SearchInput): Cocktail[] {
  const valid = validateSearchInput(input)
  const query = normalize(valid.query || '')
  const matchesQuery = (cocktail: Cocktail) => {
    if (!query) return true
    const searchable = normalize([cocktail.name, cocktail.description, cocktail.mood, cocktail.alcohol, cocktail.level, ...cocktail.ingredients, ...cocktail.steps].join(' '))
    const terms = query.split(/[ ,.!?]+/).filter(Boolean)
    return terms.every(term => searchable.includes(term) || Object.entries(koreanTerms).some(([key, aliases]) => key.toLowerCase() === term || aliases.some(alias => term.includes(alias) || alias.includes(term)) && searchable.includes(key.toLowerCase())))
  }
  const filter = (includeQuery: boolean, includeStrength: boolean, includeMood: boolean) => cocktails.filter(cocktail => {
    const alcoholMatch = !valid.availableAlcohols?.length || valid.availableAlcohols.includes(cocktail.alcohol)
    const strengthMatch = !includeStrength || !valid.strength || cocktail.level === valid.strength
    const moodMatch = !includeMood || !valid.mood || cocktail.mood === valid.mood
    return alcoholMatch && strengthMatch && moodMatch && (!includeQuery || matchesQuery(cocktail))
  })
  const exact = filter(true, true, true)
  const relaxedQuery = filter(false, true, true)
  const relaxedMood = filter(false, true, false)
  const relaxedStrength = filter(false, false, true)
  const hasConstraint = Boolean(valid.mood || valid.strength || valid.availableAlcohols?.length)
  return exact.length ? exact : relaxedQuery.length && hasConstraint ? relaxedQuery : relaxedMood.length && hasConstraint ? relaxedMood : relaxedStrength.length && hasConstraint ? relaxedStrength : !query && !hasConstraint ? filter(false, false, false) : []
}

function cocktailPayload(cocktailsToReturn: Cocktail[]) { return cocktailsToReturn.map(({ id, name, mood, alcohol, level, description, ingredients, steps, time }) => ({ id, name, mood, alcohol, level, description, ingredients, steps, time })) }
function json(status: number, payload: unknown) { return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } }) }
function fallbackResponse(input: AgentRequest, reason: string) { const queryResults = searchCocktails({ mood: input.mood, availableAlcohols: input.availableAlcohols, strength: input.strength, query: input.message }); const results = (queryResults.length ? queryResults : searchCocktails({ mood: input.mood, availableAlcohols: input.availableAlcohols, strength: input.strength })).slice(0, 3); return { ok: true, fallback: true, usedTool: false, answer: results.length ? `${results[0].name}을 기본 추천으로 안내해드릴게요.` : '조건에 맞는 칵테일을 찾지 못했어요. 술 종류나 도수를 조금 넓혀보세요.', cocktails: cocktailPayload(results), selection: { mood: input.mood, moodTheme: input.moodTheme, availableAlcohols: input.availableAlcohols, strength: input.strength }, reason } }

export default { async fetch(request: Request) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED', message: 'POST 요청만 사용할 수 있습니다.' })
  let body: unknown
  try { body = await request.json() } catch { return json(400, { ok: false, error: 'INVALID_JSON', message: '요청 본문이 올바른 JSON이 아닙니다.' }) }
  const bodyRecord = body && typeof body === 'object' ? body as Record<string, unknown> : null
  if (!bodyRecord || typeof bodyRecord.message !== 'string' || !bodyRecord.message.trim()) return json(400, { ok: false, error: 'INVALID_INPUT', message: 'message가 필요합니다.' })
  const input = bodyRecord as AgentRequest
  try { validateSearchInput(input); } catch { return json(400, { ok: false, error: 'INVALID_INPUT', message: 'mood, availableAlcohols, strength 또는 query 형식이 올바르지 않습니다.' }) }
  if (!process.env.OPENAI_API_KEY) return json(503, { ok: false, error: 'OPENAI_API_KEY_MISSING', message: '서버 환경 변수에 OPENAI_API_KEY를 설정해주세요.' })

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: 'You are AI Bartender. Always call search_cocktails before recommending. Infer the best moodTheme and strength from the user prompt. Use moodTheme for the ten mood cards, mood for the legacy cocktail catalog, and availableAlcohols when the user mentions a spirit. Never invent a cocktail. The final recommendation must use only cocktail ids returned by the tool.' },
    { role: 'user', content: input.message },
  ]
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, tools: [searchTool], tool_choice: { type: 'function', function: { name: 'search_cocktails' } }, temperature: 0.1 }) })
    if (!openaiResponse.ok) throw new Error(`OpenAI request failed with ${openaiResponse.status}`)
    const completion = await openaiResponse.json() as { choices?: Array<{ message?: { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> }
    const toolCall = completion.choices?.[0]?.message?.tool_calls?.find(call => call.function.name === 'search_cocktails')
    if (!toolCall) throw new Error('search_cocktails was not called')
    const toolInput = validateSearchInput(JSON.parse(toolCall.function.arguments) as SearchInput)
    const results = searchCocktails(toolInput)
    const safeResults = cocktailPayload(results)
    return json(200, { ok: true, fallback: false, usedTool: true, answer: safeResults.length ? `${safeResults[0].name}을 추천합니다.` : '조건에 맞는 칵테일을 찾지 못했어요. 술 종류나 도수를 조금 넓혀보세요.', cocktails: safeResults, selection: { mood: toolInput.mood, moodTheme: toolInput.moodTheme, availableAlcohols: toolInput.availableAlcohols, strength: toolInput.strength } })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    return json(200, fallbackResponse(input, `OpenAI 호출 실패: ${reason}`))
  }
} }
