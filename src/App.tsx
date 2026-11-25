import { useEffect, useRef, useState } from 'react'
import { evaluate, type Evaluation } from './gemini'
import { capture, readImage, resizeImage } from './image'

type Entry = { id: string; number: number; name: string; score: number; title: string; commentary: string; thumbnail: string }
const storageKey = 'concurso-navideno-v1'
const configuredKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() || ''

function loadEntries(): Entry[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (!Array.isArray(data)) return []
    return data.filter((entry): entry is Entry => entry && typeof entry.id === 'string' &&
      Number.isInteger(entry.number) && typeof entry.name === 'string' &&
      typeof entry.score === 'number' && Number.isFinite(entry.score) &&
      typeof entry.title === 'string' && typeof entry.commentary === 'string' &&
      typeof entry.thumbnail === 'string')
  } catch {
    return []
  }
}

function App() {
  const [entries, setEntries] = useState<Entry[]>(loadEntries)
  const [image, setImage] = useState('')
  const [name, setName] = useState('')
  const [result, setResult] = useState<Evaluation | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [camera, setCamera] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [settings, setSettings] = useState(false)
  const [key, setKey] = useState(() => {
    try { return sessionStorage.getItem('gemini-api-key') || '' } catch { return '' }
  })
  const video = useRef<HTMLVideoElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!camera) return
    let active = true
    let stream: MediaStream | undefined
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('La cámara no está disponible. Usa HTTPS o sube una imagen.')
      setCamera(false)
      return
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false })
      .then(media => {
        if (!active) {
          media.getTracks().forEach(track => track.stop())
          return
        }
        stream = media
        if (video.current) video.current.srcObject = media
      })
      .catch(() => {
        if (active) {
          setError('No pudimos acceder a la cámara. Comprueba los permisos o sube una imagen.')
          setCamera(false)
        }
      })
    return () => {
      active = false
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [camera, facing])

  async function selectFile(file?: File) {
    if (!file) return
    setError('')
    try {
      const photo = await readImage(file)
      setCamera(false)
      setImage(photo)
      setResult(null)
      setSaved(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.')
    }
  }

  function takePhoto() {
    try {
      if (!video.current) return
      setImage(capture(video.current))
      setCamera(false)
      setResult(null)
      setSaved(false)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo capturar la foto.')
    }
  }

  async function submit() {
    const apiKey = configuredKey || key.trim()
    if (!apiKey) {
      setSettings(true)
      setError('Añade una clave de Gemini en configuración para evaluar tu foto.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      setResult(await evaluate(image, apiKey))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo evaluar la foto.')
    } finally {
      setLoading(false)
    }
  }

  function updateEntries(next: Entry[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setEntries(next)
      setError('')
      return true
    } catch {
      setError('No se pudo guardar el ranking. Es posible que el almacenamiento del navegador esté lleno o deshabilitado.')
      return false
    }
  }

  async function saveResult() {
    if (!result || saved) return
    try {
      const thumbnail = await resizeImage(image, 200, 0.6)
      const number = Math.max(0, ...entries.map(entry => entry.number)) + 1
      const entry: Entry = { id: crypto.randomUUID(), number, name: name.trim() || `Participante #${number}`, score: result.score, title: result.awardTitle, commentary: result.commentary, thumbnail }
      if (updateEntries([...entries, entry])) setSaved(true)
    } catch {
      setError('No se pudo crear la miniatura para el ranking.')
    }
  }

  function resetPhoto() {
    setCamera(false)
    setImage('')
    setResult(null)
    setName('')
    setSaved(false)
    setError('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const sorted = [...entries].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen">
      <header className="border-b border-emerald-900/10 bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <a href="#" className="flex items-center gap-2 font-bold tracking-tight text-emerald-950"><span className="text-2xl">✳</span> El gran desfile navideño</a>
          {!configuredKey && <button className="text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline" onClick={() => setSettings(!settings)}>⚙ Configuración</button>}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        <section className="py-10 text-center sm:py-14">
          <span className="eyebrow">Una fiesta de creatividad</span>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">Tu look merece<br /><span className="text-red-700">un poco de magia.</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-600">Sube tu foto, descubre qué opina nuestro jurado de IA y compite por el atuendo más original de la fiesta.</p>
        </section>

        {settings && !configuredKey && <section className="card mx-auto mb-6 max-w-2xl">
          <h2 className="font-bold text-emerald-950">Configuración de Gemini</h2>
          <p className="mt-1 text-sm text-stone-600">La clave se guarda solo durante esta sesión en este navegador. No la compartas.</p>
          <label htmlFor="api-key" className="mt-4 block text-sm font-semibold">Clave de API</label>
          <input id="api-key" type="password" autoComplete="off" className="input mt-2" value={key} onChange={event => {
            const value = event.target.value
            setKey(value)
            try { if (value) sessionStorage.setItem('gemini-api-key', value); else sessionStorage.removeItem('gemini-api-key') } catch { setError('No se pudo guardar la clave en esta sesión; puedes usarla mientras esta página permanezca abierta.') }
          }} />
          <button className="mt-3 text-sm font-semibold text-emerald-800 underline" onClick={() => setSettings(false)}>Cerrar configuración</button>
        </section>}

        {error && <div role="alert" className="mx-auto mb-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.85fr]">
          <section className="card">
            <div className="flex items-start justify-between gap-3">
              <div><span className="eyebrow">El escenario es tuyo</span><h2 className="mt-1 text-2xl font-bold text-emerald-950">Evalúa tu disfraz</h2></div>
              <span className="text-3xl" aria-hidden="true">🎄</span>
            </div>

            {camera ? <div className="mt-6">
              <video ref={video} autoPlay playsInline muted className="aspect-[4/3] w-full rounded-2xl bg-stone-900 object-cover" />
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="primary flex-1" onClick={takePhoto}>📸 Capturar foto</button>
                <button className="secondary" onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')}>↻ Cambiar cámara</button>
                <button className="secondary" onClick={() => setCamera(false)}>Cerrar</button>
              </div>
            </div> : image ? <div className="mt-6">
              <img src={image} alt="Foto seleccionada para evaluar" className="max-h-96 w-full rounded-2xl bg-stone-100 object-contain" />
              {!loading && !result && <button className="mt-3 text-sm font-semibold text-emerald-800 underline" onClick={resetPhoto}>Cambiar foto</button>}
            </div> : <div className="dropzone mt-6" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]) }}>
              <div className="text-4xl" aria-hidden="true">📷</div>
              <p className="mt-3 font-bold text-emerald-950">Una foto, mucha personalidad</p>
              <p className="mt-1 text-sm text-stone-500">Sube o arrastra una imagen, o usa tu cámara.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button className="primary" onClick={() => fileInput.current?.click()}>Subir imagen</button>
                <button className="secondary" onClick={() => { setError(''); setCamera(true) }}>Usar cámara</button>
              </div>
            </div>}
            <input ref={fileInput} type="file" accept="image/*" className="sr-only" aria-label="Seleccionar imagen" onChange={event => { void selectFile(event.target.files?.[0]); event.target.value = '' }} />

            {image && !loading && <div className="mt-5">
              <label htmlFor="participant" className="text-sm font-semibold text-stone-700">Nombre del participante <span className="font-normal text-stone-500">(opcional)</span></label>
              <input id="participant" className="input mt-2" placeholder="¿Quién lleva este look?" maxLength={80} value={name} onChange={event => setName(event.target.value)} />
            </div>}
            {image && !result && !loading && <button className="primary mt-4 w-full" onClick={() => void submit()}>✦ Evaluar disfraz</button>}
            {loading && <div role="status" className="mt-6 rounded-2xl bg-emerald-50 p-6 text-center"><div className="animate-bounce text-3xl">✨</div><p className="mt-2 font-bold text-emerald-900">Los duendes están deliberando...</p><p className="mt-1 text-sm text-emerald-800">Preparando una evaluación llena de espíritu navideño.</p></div>}

            {result && !result.isChristmasOutfit && <div className="mt-6 rounded-2xl bg-amber-50 p-5"><h3 className="font-bold text-amber-950">¡Oh, oh, oh! 🎅</h3><p className="mt-2 text-sm leading-6 text-amber-900">Los duendes no encontraron un atuendo navideño en esta foto. ¡Busca tu mejor look festivo y vuelve a intentarlo!</p><button className="secondary mt-4" onClick={resetPhoto}>Probar otra foto</button></div>}
            {result?.isChristmasOutfit && <div className="mt-6 border-t border-stone-100 pt-6">
              <div className="flex items-center justify-between gap-4"><div><span className="eyebrow">Premio al estilo</span><h3 className="mt-1 text-xl font-bold text-emerald-950">{result.awardTitle}</h3></div><div className="rounded-2xl bg-emerald-900 px-4 py-2 text-center text-white"><strong className="text-3xl">{result.score.toFixed(1)}</strong><span className="block text-xs text-emerald-200">de 10</span></div></div>
              <p className="mt-4 leading-7 text-stone-600">{result.commentary}</p>
              <div className="mt-5 space-y-3">{([['Originalidad', result.breakdown.originality], ['Espíritu navideño', result.breakdown.christmasSpirit], ['Ejecución', result.breakdown.execution]] as const).map(([label, score]) => <div key={label}><div className="mb-1 flex justify-between text-sm font-semibold"><span>{label}</span><span>{score.toFixed(1)}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${score * 10}%` }} /></div></div>)}</div>
              <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>💡 Un toque extra: </strong>{result.improvementTip}</p>
              <div className="mt-5 flex flex-wrap gap-2"><button className="primary flex-1" disabled={saved} onClick={() => void saveResult()}>{saved ? '✓ Añadido al ranking' : 'Añadir al ranking'}</button><button className="secondary" onClick={resetPhoto}>Evaluar otro disfraz</button></div>
            </div>}
          </section>

          <section className="card">
            <div className="flex items-start justify-between gap-3"><div><span className="eyebrow">Que empiece el concurso</span><h2 className="mt-1 text-2xl font-bold text-emerald-950">Tabla de posiciones</h2><p className="mt-1 text-sm text-stone-500">Guardada en este navegador.</p></div><span className="text-3xl" aria-hidden="true">🏆</span></div>
            {sorted.length === 0 ? <div className="mt-6 rounded-2xl bg-stone-50 px-5 py-12 text-center"><p className="text-3xl">🌟</p><p className="mt-3 font-semibold text-emerald-950">Aún no hay participantes</p><p className="mt-1 text-sm text-stone-500">¡Sé el primero en entrar al ranking!</p></div> : <ol className="mt-5 space-y-3">{sorted.map((entry, index) => <li key={entry.id} className="flex gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3">
              <span className="w-7 pt-1 text-center text-lg font-bold" aria-label={`Posición ${index + 1}`}>{['🥇', '🥈', '🥉'][index] || `${index + 1}`}</span>
              <img src={entry.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h3 className="truncate font-bold text-emerald-950">{entry.name}</h3><strong className="text-emerald-800">{entry.score.toFixed(1)}</strong></div><p className="text-sm font-semibold text-red-700">{entry.title}</p><p className="mt-1 text-sm leading-5 text-stone-600">{entry.commentary}</p><button className="mt-2 text-xs font-semibold text-stone-500 underline" onClick={() => updateEntries(entries.filter(item => item.id !== entry.id))} aria-label={`Eliminar a ${entry.name}`}>Eliminar</button></div>
            </li>)}</ol>}
            {sorted.length > 0 && <button className="mt-5 text-sm font-semibold text-stone-500 underline hover:text-red-700" onClick={() => { if (window.confirm('¿Quieres reiniciar todo el concurso? Esta acción no se puede deshacer.')) updateEntries([]) }}>Reiniciar concurso</button>}
          </section>
        </div>
        <p className="mt-8 text-center text-xs leading-5 text-stone-500">Las fotos se envían a Google Gemini para su evaluación. El ranking permanece en este dispositivo.</p>
      </main>
    </div>
  )
}

export default App
