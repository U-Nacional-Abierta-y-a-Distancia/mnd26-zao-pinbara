// 1. Buscamos todos los pasos y todas las capas
const pasos = document.querySelectorAll('.paso');
const capas = document.querySelectorAll('.capa');

// 2. Muestra la capa que se llame igual y esconde las demás
function activarCapa(nombre) {
  capas.forEach(capa => {
    capa.classList.toggle('activa', capa.dataset.capa === nombre);
  });
}

// 3. MAPA: ilumina los departamentos que pida el paso
const deptos = document.querySelectorAll('.depto');
const nombreMapa = document.getElementById('mapaNombre');

function resaltar(lista) {
  // lista es un texto como "vichada" o "meta,guaviare" o "orinoquia"
  const pedidos = lista ? lista.split(',').map(t => t.trim()) : [];
  deptos.forEach(d => {
    const encendido = pedidos.includes(d.id) || pedidos.includes(d.dataset.region);
    d.classList.toggle('resaltado', encendido);
    d.classList.toggle('atenuado', pedidos.length > 0 && !encendido);
  });
  // si es un solo departamento, escribe su nombre encima
  const unico = pedidos.length === 1 ? document.getElementById(pedidos[0]) : null;
  mostrarNombre(unico && unico.classList.contains('depto') ? unico : null);
}

function mostrarNombre(depto) {
  if (!depto) { nombreMapa.textContent = ''; return; }
  const caja = depto.getBBox();                    // rectángulo que ocupa el departamento
  nombreMapa.setAttribute('x', caja.x + caja.width / 2);
  nombreMapa.setAttribute('y', caja.y + caja.height / 2);
  nombreMapa.textContent = depto.dataset.nombre;
}

// ALERTA: enciende un departamento en alerta y apaga los demás ('' = quitar alerta)
let modoAlerta = false;
function alertar(id) {
  const svg = document.getElementById('mapa');
  svg.querySelector('.marcador-alerta')?.remove();
  modoAlerta = Boolean(id);
  deptos.forEach(d => {
    d.classList.remove('resaltado', 'atenuado');
    d.classList.toggle('alerta', d.id === id);
    d.classList.toggle('apagado', modoAlerta && d.id !== id);
  });
  if (!modoAlerta) { mostrarNombre(null); return; }
  const depto = document.getElementById(id);
  const caja = depto.getBBox();
  const x = caja.x + caja.width / 2, y = caja.y + caja.height / 2 - 20;
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'marcador-alerta');
  g.innerHTML = `<circle class="onda" cx="${x}" cy="${y}" r="22"/>
    <circle class="punto" cx="${x}" cy="${y}" r="22"/>
    <text x="${x}" y="${y + 11}" text-anchor="middle">!</text>`;
  svg.insertBefore(g, nombreMapa);
  nombreMapa.setAttribute('x', x);
  nombreMapa.setAttribute('y', y + 70);
  nombreMapa.textContent = depto.dataset.nombre;
}

// En modo alerta solo responde el departamento en alerta: muestra su caso
function tocarEnAlerta(depto) {
  if (!depto.classList.contains('alerta')) return;
  const caso = document.getElementById('caso' + depto.id.charAt(0).toUpperCase() + depto.id.slice(1));   // ej: casoMeta
  if (!caso) return;
  caso.hidden = false;                     // desbloquea la escena del caso
  revisarPasos();
  const pista = document.getElementById('pista' + depto.id.charAt(0).toUpperCase() + depto.id.slice(1));
  if (pista) pista.hidden = true;
  caso.scrollIntoView({ behavior: sinMovimientoMapa ? 'auto' : 'smooth', block: 'center' });
}
const sinMovimientoMapa = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tocar o hacer clic en un departamento muestra su nombre
deptos.forEach(d => {
  const tocar = () => modoAlerta ? tocarEnAlerta(d) : resaltar(d.classList.contains('resaltado') && document.querySelectorAll('.depto.resaltado').length === 1 ? '' : d.id);
  d.addEventListener('click', tocar);
  d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocar(); } });
});

// YAKU: muestra la versión que pida el paso (1, 2, 3 o 4)
const yaku = document.getElementById('yaku');
function cambiarYaku(numero) {
  if (yaku.dataset.estado === numero) return;          // ya está en esa versión
  const anterior = yaku.dataset.estado;
  yaku.dataset.estado = numero;
  yaku.querySelectorAll('.estado').forEach(img => {
    img.classList.toggle('activo', img.dataset.estado === numero);
  });
  const efecto = Number(numero) > Number(anterior) ? 'transformando' : 'cambio';   // avanza = se transforma
  yaku.classList.remove('cambio', 'transformando');      // reinicia la animación
  void yaku.offsetWidth;
  yaku.classList.add(efecto);
}

// SONIDO DE AMBIENTE
// Para agregar otro: pongan el archivo en la carpeta  y súmenlo aquí con un nombre.
// "volumen" va de 0 a 1 (el del titán es más bajo porque el archivo suena más fuerte)
const AMBIENTES = {
  naturaleza: { archivo: 'naturaleza.mp3', volumen: 0.6 },
  titan:      { archivo: 'titan.mp3',      volumen: 0.3 }
};
const pistas = {};                   // los audios se crean solo cuando se necesitan
let sonidoActivo = false;
let ambienteActual = '';

function pista(nombre) {
  if (!pistas[nombre]) {
    const a = new Audio(AMBIENTES[nombre].archivo);
    a.loop = true; a.volume = 0; a.preload = 'auto';
    pistas[nombre] = a;
  }
  return pistas[nombre];
}

// Sube o baja el volumen de una pista poco a poco
function fundir(audio, destino, ms = 1500) {
  clearInterval(audio._fundido);
  const inicio = audio.volume, pasos = 30;
  let i = 0;
  if (destino > 0 && audio.paused) audio.play().catch(() => {});
  audio._fundido = setInterval(() => {
    i++;
    audio.volume = Math.min(1, Math.max(0, inicio + (destino - inicio) * (i / pasos)));
    if (i >= pasos) {
      clearInterval(audio._fundido);
      if (destino === 0) audio.pause();
    }
  }, ms / pasos);
}

function ponerAmbiente(nombre) {
  nombre = AMBIENTES[nombre] ? nombre : '';
  ambienteActual = nombre;
  if (!sonidoActivo) return;
  Object.keys(pistas).forEach(n => { if (n !== nombre) fundir(pistas[n], 0); });
  if (nombre) fundir(pista(nombre), AMBIENTES[nombre].volumen);
}

const botonSonido = document.getElementById('activarSonido');
const toggleSonido = document.getElementById('sonidoToggle');
function cambiarSonido(activar) {
  sonidoActivo = activar;
  toggleSonido.textContent = activar ? '🔊' : '🔇';
  toggleSonido.setAttribute('aria-label', activar ? 'Silenciar' : 'Activar sonido');
  botonSonido.hidden = true;
  if (activar) ponerAmbiente(ambienteActual);
  else Object.values(pistas).forEach(a => fundir(a, 0, 400));
}
botonSonido.addEventListener('click', () => cambiarSonido(true));
toggleSonido.addEventListener('click', () => cambiarSonido(!sonidoActivo));

// 4. ¿Qué paso se está leyendo? El que tenga su TEXTO más cerca del centro de la pantalla.
//    Se mide el texto (tarjeta, letrero, preguntas...) y no la sección completa,
//    así el fondo siempre corresponde al texto que la persona tiene enfrente,
//    sin importar el tamaño de la pantalla.
const CONTENIDO = '.mision, .tarjeta, .quiz, .texto-grande, .logo';
let pasoActual = null;

function aplicarPaso(paso) {
  if (paso === pasoActual) return;
  pasoActual = paso;
  activarCapa(paso.dataset.capa);
  if (paso.dataset.alerta !== undefined) alertar(paso.dataset.alerta);
  else if (paso.dataset.resaltar !== undefined) { alertar(''); resaltar(paso.dataset.resaltar); }
  if (paso.dataset.yaku) cambiarYaku(paso.dataset.yaku);
  ponerAmbiente(paso.dataset.audio || '');
}

function revisarPasos() {
  const centro = window.innerHeight / 2;
  let mejor = null, menorDistancia = Infinity;
  pasos.forEach(paso => {
    if (paso.hidden) return;                                   // pasos bloqueados no cuentan
    const caja = (paso.querySelector(CONTENIDO) || paso).getBoundingClientRect();
    if (caja.bottom < 0 || caja.top > window.innerHeight) return;   // no está en pantalla
    const distancia = Math.abs((caja.top + caja.bottom) / 2 - centro);
    if (distancia < menorDistancia) { menorDistancia = distancia; mejor = paso; }
  });
  if (mejor) aplicarPaso(mejor);
}

// 5. Revisamos al hacer scroll y al cambiar el tamaño de la ventana
let revisando = false;
window.addEventListener('scroll', () => {
  if (revisando) return;
  revisando = true;
  requestAnimationFrame(() => { revisando = false; revisarPasos(); });
}, { passive: true });
window.addEventListener('resize', revisarPasos);
revisarPasos();


// NATURALEZA: parallax. Cada planta se mueve a su propia velocidad (data-vel)
const decos = document.querySelectorAll('.deco');
const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let pendiente = false;
function moverNaturaleza() {
  pendiente = false;
  const centro = window.innerHeight / 2;
  decos.forEach(d => {
    const caja = d.parentElement.getBoundingClientRect();
    if (caja.bottom < -200 || caja.top > window.innerHeight + 200) return;   // fuera de pantalla: no calcula
    const distancia = caja.top + caja.height / 2 - centro;                  // qué tan lejos está del centro
    d.style.setProperty('--py', (distancia * parseFloat(d.dataset.vel || 0)).toFixed(1) + 'px');
  });
}
if (!sinMovimiento) {
  window.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(moverNaturaleza); } }, { passive: true });
  window.addEventListener('resize', moverNaturaleza);
  moverNaturaleza();
}


// ESCENA 1: separa el texto grande en palabras para que aparezcan una por una
document.querySelectorAll('.texto-grande').forEach(t => {
  const palabras = t.textContent.trim().split(/\s+/);
  t.innerHTML = palabras.map((p, i) => `<span class="palabra" style="--i:${i}">${p}</span>`).join(' ');
  new IntersectionObserver(([e]) => { if (e.isIntersecting) t.classList.add('visible'); }, { threshold: 0.4 }).observe(t);
});


// RELÁMPAGOS en el fondo de la actividad (solo mientras esa capa está activa)
const lienzoRayo = document.getElementById('relampagos');
const capaActividad = lienzoRayo.parentElement;
const ctxRayo = lienzoRayo.getContext('2d');
let rayos = [];          // rayos que se están desvaneciendo
let destello = 0;        // brillo del cielo (0 a 1)
let animandoRayo = false;

function medirRayo() {
  lienzoRayo.width = Math.round(innerWidth * devicePixelRatio);
  lienzoRayo.height = Math.round(innerHeight * devicePixelRatio);
}
medirRayo();
window.addEventListener('resize', medirRayo);

// Crea un rayo quebrado desde arriba, con alguna rama
function crearRayo() {
  const W = lienzoRayo.width, H = lienzoRayo.height;
  const puntos = [];
  let x = W * (0.1 + Math.random() * 0.8), y = 0;
  const fin = H * (0.45 + Math.random() * 0.35);
  const ramas = [];
  while (y < fin) {
    puntos.push([x, y]);
    y += H * (0.02 + Math.random() * 0.04);
    x += (Math.random() - 0.5) * W * 0.06;
    if (Math.random() < 0.12) {                                // rama
      const rama = [[x, y]]; let rx = x, ry = y;
      for (let k = 0; k < 4 + Math.random() * 4; k++) {
        ry += H * 0.03; rx += (Math.random() - 0.3) * W * 0.04 * (Math.random() < 0.5 ? -1 : 1);
        rama.push([rx, ry]);
      }
      ramas.push(rama);
    }
  }
  puntos.push([x, y]);
  return { trazos: [puntos, ...ramas], vida: 1 };
}

function dibujarRayos() {
  const W = lienzoRayo.width, H = lienzoRayo.height;
  ctxRayo.clearRect(0, 0, W, H);
  if (destello > 0) {                                          // el cielo se ilumina un instante
    ctxRayo.fillStyle = `rgba(170, 215, 255, ${destello * 0.18})`;
    ctxRayo.fillRect(0, 0, W, H);
    destello = Math.max(0, destello - 0.06);
  }
  rayos.forEach(r => {
    const parpadeo = r.vida > 0.75 ? 1 : (Math.random() < 0.15 ? 0.3 : 1);
    r.trazos.forEach((t, i) => {
      ctxRayo.beginPath();
      t.forEach(([px, py], k) => k ? ctxRayo.lineTo(px, py) : ctxRayo.moveTo(px, py));
      ctxRayo.strokeStyle = `rgba(225, 245, 255, ${r.vida * parpadeo * (i ? 0.55 : 0.95)})`;
      ctxRayo.lineWidth = (i ? 1.2 : 2.4) * devicePixelRatio;
      ctxRayo.shadowColor = 'rgba(120, 200, 255, 0.9)';
      ctxRayo.shadowBlur = 18 * devicePixelRatio;
      ctxRayo.stroke();
    });
    r.vida -= 0.035;
  });
  ctxRayo.shadowBlur = 0;
  rayos = rayos.filter(r => r.vida > 0);
  if (rayos.length || destello > 0) requestAnimationFrame(dibujarRayos);
  else animandoRayo = false;
}

function lanzarRayo() {
  if (capaActividad.classList.contains('activa') && !document.hidden) {
    rayos.push(crearRayo());
    destello = 1;
    if (!animandoRayo) { animandoRayo = true; requestAnimationFrame(dibujarRayos); }
  }
  setTimeout(lanzarRayo, 2500 + Math.random() * 4500);      // cada 2,5 a 7 segundos
}
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(lanzarRayo, 1200);


/* =====================================================================
   6. ACTIVIDAD: 3 PREGUNTAS
   El equipo solo cambia los textos de aquí abajo.
   - "correcta: true" marca la respuesta buena (solo una por pregunta).
   - "boton" es el texto del botón para comprobar.
   ===================================================================== */
const PREGUNTAS = [
  {
    titulo: 'La lluvia',
    hora: '4:00 a. m.',
    situacion: 'El agua está subiendo cerca de varias viviendas. A las 4:00 a. m., llega un mensaje al chat comunitario, pero nadie sabe qué tan grave es la situación.',
    pregunta: '¿Qué haces?',
    boton: 'Comprobar mi decisión',
    opciones: [
      { texto: 'Me acerco al río para revisar el nivel del agua.',               correcta: false },
      { texto: 'Reporto la situación y consulto alertas oficiales.',             correcta: true  },
      { texto: 'Espero a que alguien confirme el peligro antes de hacer algo.',  correcta: false }
    ]
  },
  {
    titulo: 'El viento',
    hora: '14:20 pm',
    situacion: 'Un vendaval acaba de pasar por la zona. Hay ramas sobre la vía y un cable eléctrico se cayó cerca del camino. Algunas personas intentan acercarse para retirarlo.',
    pregunta: '¿Qué haces?',
    boton: 'Revelar consecuencia',
    opciones: [
      { texto: 'Me uno a mover el cable para despejar el camino.',                                                        correcta: false },
      { texto: 'Me alejo, evito que otros se acerquen si puedo hacerlo y aviso a los servicios de emergencia.',           correcta: true  },
      { texto: 'Paso rápido por debajo del cable para llegar a mi casa.',                                                 correcta: false }
    ]
  },
  {
    titulo: 'La tierra',
    hora: '06:20 am',
    situacion: 'Después de una noche de lluvias fuertes, un vecino observa grietas nuevas. Minutos después, parte de la tierra cae sobre un camino cercano a varias viviendas. ¿Será seguro pasar?',
    pregunta: '¿Qué haces?',
    boton: 'Revelar consecuencia',
    opciones: [
      { texto: 'Me acerco a revisar las grietas para saber si son profundas.',                                     correcta: false },
      { texto: 'Evito el camino afectado, reporto la situación y sigo las indicaciones de las autoridades.',        correcta: true  },
      { texto: 'Cruzo rápido antes de que vuelva a caer tierra.',                                                  correcta: false }
    ]
  }
];

// Lo que dice Yaku después de comprobar
const RETRO_BIEN = '¡Bien hecho! No esperaste a que el peligro creciera para actuar.';
const RETRO_MAL  = '¡Espera! Esa decisión podría empeorar las cosas. Mira bien las señales e inténtalo otra vez.';

// true = si se equivocan, pueden elegir entre "Intentar otra vez" o seguir.
// false = si se equivocan, solo pueden seguir.
// (el puntaje siempre cuenta solo el primer intento)
const REINTENTAR_PREGUNTA = true;

// Resultado final según cuántas acertaron al primer intento (0, 1, 2 o 3)
const RESULTADOS = [
  { titulo: 'Aprendiz de Yaku',       detalle: '',                         etiquetaMision: 'Misión', mision: 'Volver a intentarlo.' },
  { titulo: 'Aprendiz de Yaku',       detalle: '',                         etiquetaMision: 'Misión', mision: 'Volver a intentarlo.' },
  { titulo: 'Explorador de señales',  detalle: '',                         etiquetaMision: 'Misión', mision: 'Volver a intentarlo.' },
  { titulo: 'Guardián del territorio', detalle: '3 señales investigadas',  etiquetaMision: 'Misión final', mision: 'Averigua cuáles son los canales oficiales para reportar emergencias y consultar alertas en tu municipio.' }
];

// true = el cierre aparece solo después de terminar las preguntas
const BLOQUEAR_FINAL = true;

const quiz = document.getElementById('quiz');
const final = document.getElementById('final');
let actual = 0;
let aciertos = 0;
let elegida = null;
let primerIntento = true;   // para contar solo el primer intento de cada situación

function barraProgreso() {
  return '<div class="quiz-progreso">' +
    PREGUNTAS.map((_, i) => `<i class="${i < actual ? 'hecha' : i === actual ? 'actual' : ''}"></i>`).join('') +
    '</div>';
}

function mostrarPregunta() {
  const p = PREGUNTAS[actual];
  elegida = null;
  primerIntento = true;
  quiz.innerHTML = `
    ${barraProgreso()}
    <div class="quiz-cabeza">
      <span class="etiqueta">${actual + 1} · <span class="q-titulo"></span></span>
      <span class="reloj"></span>
    </div>
    <p class="situacion"></p>
    <h3></h3>
    <div class="opciones" role="radiogroup"></div>
    <button class="boton comprobar" type="button" disabled></button>`;
  quiz.querySelector('.q-titulo').textContent = p.titulo;
  quiz.querySelector('.reloj').textContent = p.hora;
  quiz.querySelector('.situacion').textContent = p.situacion;
  quiz.querySelector('h3').textContent = p.pregunta;
  const comprobar = quiz.querySelector('.comprobar');
  comprobar.textContent = p.boton;

  const caja = quiz.querySelector('.opciones');
  p.opciones.forEach((op, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opcion';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.innerHTML = `<span class="letra">${'ABC'[i]}</span><span></span>`;
    b.lastChild.textContent = op.texto;
    b.addEventListener('click', () => {                     // 1) elegir (se puede cambiar)
      elegida = i;
      caja.querySelectorAll('.opcion').forEach((x, k) => x.setAttribute('aria-checked', String(k === i)));
      comprobar.disabled = false;
    });
    caja.appendChild(b);
  });
  comprobar.addEventListener('click', () => responder(p.opciones[elegida], caja.children[elegida]));   // 2) comprobar
}

function avanzar() {
  actual++;
  actual < PREGUNTAS.length ? mostrarPregunta() : mostrarResultado();
  quiz.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function mensajeYaku(bien, texto) {
  const caja = document.createElement('div');
  caja.className = 'retro' + (bien ? '' : ' mal');
  caja.innerHTML = `<img class="retro-yaku" src="yaku-${bien ? 1 : 3}.png" alt=""><div><b>Yaku:</b> <span></span></div>`;
  caja.querySelector('span').textContent = texto;
  return caja;
}

function responder(op, boton) {
  quiz.querySelector('.retro')?.remove();
  const opciones = quiz.querySelectorAll('.opcion');

  if (!op.correcta) {
    primerIntento = false;
    boton.classList.add('mal');
    boton.setAttribute('aria-checked', 'false');
    opciones.forEach(b => b.disabled = true);
    quiz.querySelector('.comprobar').hidden = true;
    const retro = mensajeYaku(false, RETRO_MAL);
    const acciones = document.createElement('div');
    acciones.className = 'botones-resultado';
    acciones.innerHTML = `<button class="boton" type="button">Intentar otra vez</button><button class="boton secundario" type="button"></button>`;
    const [otraVez, seguir] = acciones.querySelectorAll('button');
    seguir.textContent = actual < PREGUNTAS.length - 1 ? 'Siguiente situación' : 'Ver resultado';
    otraVez.addEventListener('click', () => {                 // vuelve a la misma situación (la opción mala queda tachada)
      retro.remove(); acciones.remove();
      opciones.forEach(b => { if (!b.classList.contains('mal')) b.disabled = false; });
      const comprobar = quiz.querySelector('.comprobar');
      comprobar.hidden = false; comprobar.disabled = true;
      elegida = null;
    });
    seguir.addEventListener('click', avanzar);                 // o sigue sin repetir
    quiz.append(retro, acciones);
    if (REINTENTAR_PREGUNTA === false) otraVez.remove();
    return;
  }
  if (primerIntento) aciertos++;

  // respuesta final de esta situación
  quiz.querySelector('.comprobar').remove();
  opciones.forEach((b, i) => {
    b.disabled = true;
    if (PREGUNTAS[actual].opciones[i].correcta) b.classList.add('bien');
  });
  quiz.append(mensajeYaku(op.correcta, op.correcta ? RETRO_BIEN : RETRO_MAL));

  const siguiente = document.createElement('button');
  siguiente.type = 'button';
  siguiente.className = 'boton';
  siguiente.textContent = actual < PREGUNTAS.length - 1 ? 'Siguiente situación' : 'Ver resultado';
  siguiente.addEventListener('click', avanzar);
  quiz.append(siguiente);
  siguiente.focus({ preventScroll: true });
}

function mostrarResultado() {
  const r = RESULTADOS[aciertos];
  const perfecto = aciertos === PREGUNTAS.length;
  quiz.innerHTML = `
    ${barraProgreso()}
    <div class="resultado-cabeza">
      <img class="resultado-yaku" src="yaku-${perfecto ? 1 : 2}.png" alt="">
      <div>
        <div class="puntaje">${aciertos}/${PREGUNTAS.length}</div>
        <h3 class="resultado-titulo"></h3>
        <p class="resultado-detalle"></p>
      </div>
    </div>
    <div class="mision-final ${perfecto ? 'cumplida' : ''}">
      <span class="etiqueta"></span>
      <p></p>
    </div>
    <div class="botones-resultado">
      <button class="boton" type="button" id="${perfecto ? 'seguir' : 'reintentar'}">${perfecto ? 'Continuar' : 'Volver a intentarlo'}</button>
      <button class="boton secundario" type="button" id="${perfecto ? 'reintentar' : 'seguir'}">${perfecto ? 'Jugar otra vez' : 'Continuar'}</button>
    </div>`;
  quiz.querySelector('.resultado-titulo').textContent = r.titulo;
  quiz.querySelector('.resultado-detalle').textContent = r.detalle;
  quiz.querySelector('.mision-final .etiqueta').textContent = r.etiquetaMision;
  quiz.querySelector('.mision-final p').textContent = r.mision;

  final.hidden = false;                        // desbloquea el cierre
  revisarPasos();
  document.getElementById('seguir').addEventListener('click', () => final.scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('reintentar').addEventListener('click', () => {
    actual = 0; aciertos = 0; mostrarPregunta();
    quiz.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

if (!BLOQUEAR_FINAL) final.hidden = false;
mostrarPregunta();


