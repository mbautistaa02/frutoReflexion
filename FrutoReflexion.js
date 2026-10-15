// ============================================================
//  JUEGO A OSCURAS CON COFRES Y PREGUNTAS  (p5.js)
//  Controles:
//    WASD o flechas ... moverse
//    E ................ abrir cofre (cuando estés cerca)
//    1-4 .............. responder la pregunta
//    Q ................ cancelar pregunta
//    R ................ reiniciar (al ganar)
// ============================================================

// ---------- Estados del juego ----------
const JUGANDO = 0;
const PREGUNTANDO = 1;
const GANADO = 2;
let estado = JUGANDO;

// ---------- Jugador ----------
let px, py;
const vel = 3;
const radioJugador = 12;

// ---------- Luz / niebla ----------
const radioLuz = 110;   // qué tan lejos ilumina tu "linterna"
let niebla;             // capa negra que se va borrando

// ---------- Controles ----------
let arriba = false, abajo = false, izq = false, der = false;

// ---------- Cofres y preguntas ----------
let cofres = [];
let banco = [];
let cofreActual = null;
const cantidadCofres = 6;

// ---------- Puntaje y mensajes ----------
let puntos = 0;
let mensaje = "";
let mensajeHasta = 0;
let mensajePanel = "";
let moving, openAu, closeAu, caveAu;
let openImg, closeImg, bgImg;

function preload() {
  moving = loadSound("moving.mp3");
  openAu = loadSound("open.mp3");
  closeAu = loadSound("close.mp3");
  caveAu = loadSound("cave.mp3");
  openImg = loadImage('open.png');
  closeImg = loadImage('closed.png');
 bgImg = loadImage('bg.png');
}
// ============================================================
function setup() {
  createCanvas(900, 650);
  pixelDensity(1);            // importante: así los índices de píxeles coinciden
  crearBancoDePreguntas();
  reiniciar();
}

function reiniciar() {
  px = width / 2;
  py = height / 2;
  puntos = 0;
  estado = JUGANDO;
  cofreActual = null;
  mensaje = "";
  mensajePanel = "";

  // Niebla totalmente negra
  niebla = createGraphics(width, height);
  niebla.pixelDensity(1);
  niebla.background(0);

  crearCofres();
}

// ============================================================
function draw() {

  image(bgImg, 0, 0, width, height);


  // Los cofres se dibujan ANTES de la niebla: solo se ven si ya iluminaste esa zona
  for (const c of cofres) c.dibujar();

  if (estado === JUGANDO) {
    moverJugador();
    // userStartAudio();
    // caveAu.loop();
    // caveAu.setVolume(0.1);
  }
  actualizarNiebla();
  image(niebla, 0, 0);

  // El jugador y la interfaz van encima de la niebla
  dibujarJugador();
  dibujarHUD();

  if (estado === PREGUNTANDO) dibujarPanelPregunta();
  if (estado === GANADO) dibujarVictoria();
}

// ============================================================
//  SUELO (para que se note la iluminación)
// ============================================================
function dibujarSuelo() {
  background(70, 60, 50);
  stroke(55, 47, 40);
  strokeWeight(1);
  for (let x = 0; x < width; x += 50) line(x, 0, x, height);
  for (let y = 0; y < height; y += 50) line(0, y, width, y);
}

// ============================================================
//  JUGADOR
// ============================================================
function moverJugador() {
  let dx = 0, dy = 0;
  if (arriba) dy -= 1;
  if (abajo)  dy += 1;
  if (izq)    dx -= 1;
  if (der)    dx += 1;

  // Normalizar para que en diagonal no vaya más rápido
  if (dx !== 0 || dy !== 0) {
    const mag = Math.sqrt(dx * dx + dy * dy);
    px += (dx / mag) * vel;
    py += (dy / mag) * vel;
  }
  px = constrain(px, radioJugador, width - radioJugador);
  py = constrain(py, radioJugador, height - radioJugador);
}

function dibujarJugador() {
  noStroke();
  fill(255, 230, 120, 60);
  ellipse(px, py, radioJugador * 4, radioJugador * 4); // brillo
  fill(255, 220, 80);
  ellipse(px, py, radioJugador * 2, radioJugador * 2);
}

// ============================================================
//  NIEBLA: borra permanentemente la zona alrededor del jugador
// ============================================================
function actualizarNiebla() {
  niebla.loadPixels();

  const x0 = max(0, floor(px - radioLuz));
  const x1 = min(width - 1, floor(px + radioLuz));
  const y0 = max(0, floor(py - radioLuz));
  const y1 = min(height - 1, floor(py + radioLuz));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - px, y - py);
      if (d < radioLuz) {
        // Centro transparente (0), borde suave hasta opaco (255)
        const nuevoAlpha = constrain(map(d, radioLuz * 0.45, radioLuz, 0, 255), 0, 255);
        const i = (y * width + x) * 4 + 3;      // canal alpha
        if (nuevoAlpha < niebla.pixels[i]) {    // solo puede aclararse, nunca oscurecerse
          niebla.pixels[i] = nuevoAlpha;
        }
      }
    }
  }
  niebla.updatePixels();
}

// ============================================================
//  COFRES
// ============================================================
class Cofre {
  constructor(x, y, pregunta) {
    this.x = x;
    this.y = y;
    this.tam = 70;
    this.abierto = false;
    this.pregunta = pregunta;
  }

dibujar() {
  imageMode(CENTER);

  if (this.abierto) {
    image(openImg, this.x, this.y, this.tam, this.tam);
  } else {
    image(closeImg, this.x, this.y, this.tam, this.tam);
  }

  imageMode(CORNER);
}

  estaCerca() {
    return dist(px, py, this.x, this.y) < 50;
  }
}

function crearCofres() {
  cofres = [];
  banco = shuffle(banco);

  let intentos = 0;
  while (cofres.length < cantidadCofres && intentos < 2000) {
    intentos++;
    const x = random(70, width - 70);
    const y = random(70, height - 70);

    let ok = dist(x, y, px, py) > 150;       // lejos del inicio
    for (const c of cofres) {
      if (dist(x, y, c.x, c.y) < 150) ok = false; // lejos de otros cofres
    }
    if (ok) {
      const p = banco[cofres.length % banco.length];
      cofres.push(new Cofre(x, y, p));
    }
  }
}

function cofreCercano() {
  for (const c of cofres) {
    if (!c.abierto && c.estaCerca()) return c;
  }
  return null;
}

// ============================================================
//  PREGUNTAS
// ============================================================
function crearBancoDePreguntas() {
  // { texto, opciones, correcta }  -> correcta es el índice (0-3)
  banco = [
    {
      texto: "¿Qué significa el acrónimo ARTE en el acompañamiento entre pares?",
      opciones: [
        "Aprendizaje, Responsabilidad, Trabajo y Enseñanza",
        "Autonomía, Respeto, Teoría y Evaluación",
        "Acción, Reflexión, Trabajo colaborativo y Error como oportunidad",
        "Acción, Resolución, Técnica y Experiencia"
      ],
      correcta: 2
    },
    {
      texto: "¿Cuál es el propósito principal de una tutoría entre pares?",
      opciones: [
        "Resolver todas las actividades del tutorado",
        "Acompañar el aprendizaje y fomentar la autonomía",
        "Explicar todos los temas sin interrupciones",
        "Evaluar los conocimientos del tutorado"
      ],
      correcta: 1
    },
    {
      texto: "¿Para qué sirve realizar recapitulaciones durante una tutoría?",
      opciones: [
        "Repetir toda la explicación desde el principio",
        "Verificar la comprensión y relacionar los conceptos trabajados",
        "Evitar que los tutorados hagan preguntas",
        "Terminar la tutoría más rápido"
      ],
      correcta: 1
    },
    {
      texto: "¿Cuáles son las cuatro variables del aprendizaje relacionadas con la metacognición?",
      opciones: [
        "Persona, tarea, estrategia y contexto",
        "Memoria, atención, motivación y evaluación",
        "Planificación, ejecución, revisión y calificación",
        "Tutor, tutorado, docente y contenido"
      ],
      correcta: 0
    },
    {
      texto: "¿Cómo se evidencia la reflexión durante una tutoría?",
      opciones: [
        "Cuando el tutor explica todo el procedimiento",
        "Cuando el estudiante memoriza los pasos",
        "Cuando se termina la actividad lo más rápido posible",
        "Cuando el estudiante analiza lo que hizo y comprende por qué funciona"
      ],
      correcta: 3
    },
    {
      texto: "¿Cuál de las siguientes acciones refleja mejor el papel de un par tutor?",
      opciones: [
        "Dar las respuestas para ahorrar tiempo",
        "Controlar cada paso del estudiante",
        "Acompañar, orientar y promover la autonomía del tutorado",
        "Evaluar al estudiante como lo haría un profesor"
      ],
      correcta: 2
    },
  ];
}

function responder(opcion) {
  const p = cofreActual.pregunta;
  if (opcion === p.correcta) {
    cofreActual.abierto = true;
    puntos += 10;
    mostrarMensaje("¡Correcto! +10 puntos");
    estado = JUGANDO;
    cofreActual = null;
    mensajePanel = "";
    if (todosAbiertos()) estado = GANADO;
  } else {
    puntos = max(0, puntos - 2);
    mensajePanel = "Incorrecto (-2). ¡Intenta de nuevo!";
  }
}

function todosAbiertos() {
  return cofres.every((c) => c.abierto);
}

function mostrarMensaje(m) {
  mensaje = m;
  mensajeHasta = millis() + 2000;
}

// ============================================================
//  INTERFAZ
// ============================================================
function dibujarHUD() {
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  const abiertos = cofres.filter((c) => c.abierto).length;
  text("Puntos: " + puntos + "   Cofres: " + abiertos + "/" + cofres.length, 15, 12);

  if (millis() < mensajeHasta) {
    textAlign(CENTER, TOP);
    fill(255, 230, 100);
    textSize(20);
    text(mensaje, width / 2, 40);
  }

  if (estado === JUGANDO) {

    const c = cofreCercano();
    if (c) {
      textAlign(CENTER, BOTTOM);
      fill(255);
      textSize(16);
      text("Presiona E para abrir", c.x, c.y - 30);
    }
  }
}

function dibujarPanelPregunta() {
  const p = cofreActual.pregunta;

  // Oscurecer el fondo
  noStroke();
  fill(0, 150);
  rect(0, 0, width, height);

  // Panel
  const w = 700, h = 330;
  const x = width / 2 - w / 2;
  const y = height / 2 - h / 2;
  fill(30, 30, 50);
  stroke(240, 200, 50);
  strokeWeight(3);
  rect(x, y, w, h, 12);

  // Pregunta
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(22);
  text(p.texto, x + 25, y + 25, w - 50, 80);

  // Opciones
  textSize(18);
  for (let i = 0; i < p.opciones.length; i++) {
    fill(200, 220, 255);
    text((i + 1) + ")  " + p.opciones[i], x + 35, y + 115 + i * 38);
  }

  // Mensaje de error y ayuda
  fill(255, 120, 120);
  textSize(16);
  text(mensajePanel, x + 25, y + h - 65);
  fill(150);
  textSize(14);
  text("Pulsa 1-4 para responder  |  Q para cancelar", x + 25, y + h - 35);
}

function dibujarVictoria() {
  noStroke();
  fill(0, 200);
  rect(0, 0, width, height);
  fill(255, 230, 100);
  textAlign(CENTER, CENTER);
  textSize(42);
  text("¡Abriste todos los cofres!", width / 2, height / 2 - 30);
  fill(255);
  textSize(22);
  text("Puntaje final: " + puntos, width / 2, height / 2 + 20);
  textSize(16);
  text("Presiona R para jugar de nuevo", width / 2, height / 2 + 60);
}

// ============================================================
//  TECLADO
// ============================================================
function keyPressed() {
  const k = key.toLowerCase();
  moving.setVolume(0.3);
  // Movimiento
  if (k === "w" || keyCode === UP_ARROW)    arriba = true;
  if (k === "s" || keyCode === DOWN_ARROW)  abajo = true;
  if (k === "a" || keyCode === LEFT_ARROW)  izq = true;
  if (k === "d" || keyCode === RIGHT_ARROW) der = true;
  
  if (arriba || abajo || izq || der) {
    if (estado === JUGANDO) {
      userStartAudio();
      if (!moving.isPlaying()) 
      moving.loop();
      moving.setVolume(0.15);
      if (!caveAu.isPlaying()) 
      caveAu.loop();
      caveAu.setVolume(0.2);
    }
  }

  if (estado === JUGANDO) {
    if (k === "e") {
      const c = cofreCercano();
      if (c) {
        cofreActual = c;
        mensajePanel = "";
        userStartAudio();
        openAu.setVolume(0.3);
        openAu.play();
        estado = PREGUNTANDO;
      }
    }
  } else if (estado === PREGUNTANDO) {
    const n = parseInt(key) - 1;   // '1' -> 0, '2' -> 1, ...
    if (n >= 0 && n < cofreActual.pregunta.opciones.length) {
      responder(n);
      userStartAudio();
      closeAu.setVolume(0.3);
      closeAu.play();
    }
    if (k === "q") {
      estado = JUGANDO;
      userStartAudio();
        openAu.setVolume(0.3);
        openAu.play();
      cofreActual = null;
    }
  } else if (estado === GANADO) {
    if (k === "r") reiniciar();
  }

  // Evita que las flechas hagan scroll en la página
  if ([UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW].includes(keyCode)) return false;
}

function keyReleased() {

  const k = key.toLowerCase();
  if (k === "w" || keyCode === UP_ARROW)    arriba = false;
  if (k === "s" || keyCode === DOWN_ARROW)  abajo = false;
  if (k === "a" || keyCode === LEFT_ARROW)  izq = false;
  if (k === "d" || keyCode === RIGHT_ARROW) der = false;
  
  if (!arriba && !abajo && !izq && !der) {
    moving.setVolume(0);
  }
}
