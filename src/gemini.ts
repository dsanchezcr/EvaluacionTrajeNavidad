export interface Evaluation {
  isChristmasOutfit: boolean
  score: number
  awardTitle: string
  breakdown: { originality: number; christmasSpirit: number; execution: number }
  commentary: string
  improvementTip: string
}

const numberSchema = { type: 'NUMBER', minimum: 1, maximum: 10 }
const schema = {
  type: 'OBJECT',
  properties: {
    isChristmasOutfit: { type: 'BOOLEAN' },
    score: numberSchema,
    awardTitle: { type: 'STRING' },
    breakdown: {
      type: 'OBJECT',
      properties: { originality: numberSchema, christmasSpirit: numberSchema, execution: numberSchema },
      required: ['originality', 'christmasSpirit', 'execution'],
    },
    commentary: { type: 'STRING' },
    improvementTip: { type: 'STRING' },
  },
  required: ['isChristmasOutfit', 'score', 'awardTitle', 'breakdown', 'commentary', 'improvementTip'],
}

const instruction = `Eres un jurado amable de disfraces navideños. Evalúa solo lo visible en la imagen. Determina si hay una persona con un atuendo o disfraz realmente navideño. Responde en español, sin burlas ni juicios sobre el cuerpo o la identidad. Da más peso a la originalidad que al espíritu navideño y la ejecución. Calibra la escala: un suéter navideño común merece aproximadamente 5.0 a 6.5; combinaciones creativas, 7.0 a 8.5; solo conceptos verdaderamente memorables o hechos a mano con gran detalle superan 9.0. Usa valores de 1.0 a 10.0 con un decimal. Incluye un título festivo divertido, una reseña amigable de 2 a 3 oraciones y una sugerencia práctica. Si no es un atuendo navideño, marca isChristmasOutfit como false.`

function validate(value: unknown): Evaluation {
  if (!value || typeof value !== 'object') throw new Error('La respuesta de la IA no tiene el formato esperado.')
  const result = value as Evaluation
  const scores = [result.score, result.breakdown?.originality, result.breakdown?.christmasSpirit, result.breakdown?.execution]
  if (typeof result.isChristmasOutfit !== 'boolean' ||
      scores.some(score => typeof score !== 'number' || !Number.isFinite(score) || score < 1 || score > 10) ||
      [result.awardTitle, result.commentary, result.improvementTip].some(text => typeof text !== 'string' || !text.trim())) {
    throw new Error('La respuesta de la IA no tiene el formato esperado.')
  }
  const round = (score: number) => Math.round(score * 10) / 10
  return { ...result, score: round(result.score), breakdown: {
    originality: round(result.breakdown.originality),
    christmasSpirit: round(result.breakdown.christmasSpirit),
    execution: round(result.breakdown.execution),
  } }
}

export async function evaluate(image: string, key: string): Promise<Evaluation> {
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'
  let response: Response
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ parts: [{ text: 'Evalúa este atuendo.' }, { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
      }),
    })
  } catch {
    throw new Error('No pudimos conectar con Gemini. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 400) {
      throw new Error('La solicitud fue rechazada. Revisa la clave de API, sus restricciones y el modelo configurado.')
    }
    if (response.status === 429) throw new Error('Se agotó la cuota de Gemini. Espera un momento o revisa tu cuota en Google AI Studio.')
    throw new Error('Gemini no pudo evaluar la foto. Inténtalo de nuevo más tarde.')
  }
  try {
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('')
    return validate(JSON.parse(text))
  } catch {
    throw new Error('La IA no devolvió una evaluación válida. Inténtalo de nuevo.')
  }
}
