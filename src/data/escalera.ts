// Escalera (/lab/escalera/): la meta, las palabras comunes y las palabras de partida.
// Se acepta cualquier palabra de src/data/palabras.json; las comunes sirven para calcular un "par" justo
// (se puede lograr sin palabras rebuscadas) y para dar pistas. Todo va sin acentos, como en el juego.

/** Como POOP en Poople. Cámbiala si prefieres otra meta (por ejemplo, 'cafe'). */
export const META = 'caca';

/** Número 1 del reto diario (hora de la Ciudad de México). */
export const PRIMER_DIA = '2026-10-11';

export const COMUNES = `
abre abro acto agua aire alas alba alma alta alto amar amor ante años apio arco arde area arma arte asar asco asno atar aula auto aves ayer azul
baja bajo bala baño base bata beba bebe beca besa beso bici bien boca boda bola bolo bono bota bote buey buzo
cabe cabo cada caer cafe caja cala cama cana cano capa cara caro casa caso cata cava caza cebo ceja cena cera cero cien cima cine cita clan club
coco codo cola come como copa coro cosa crea creo cruz cubo cuna cura
dado dama daño dato debe debo dedo deja dejo diez dios doce dona duda dudo duna duro
echa echo edad ella ello ente eres esta este esto euro
fama faro fase fila fino flor foca foco foto frio fuma
gala gama gana gano gasa gata gato gema giro goma gota gris guia
haba hace hago hada hija hijo hilo hito hoja hola hora hoyo humo huye
idea iman isla
jefe juez jugo joya jota
lado lago lana lata lava lazo leer leña leon leve lima lino lira liso lobo loca loco lodo loma lona loro losa lote luna lupa luto
mago mala malo mama mano mapa masa mata mate mayo mazo mesa meta miel mina mira miro misa moda modo moho mole mona mono mora moto muda mudo muro
nabo nada nado nata nave nena nene nido niña niño nota nube nudo nuez
obra ocio ocho odio ojos olla onda onza orar osos otro
paga pago paja pala palo pana papa para paro pasa paso pata pato pavo peca pega pelo pena peña pera pero peso pica pico pide pido piel pila pino
piña pipa pisa piso pita plan poca poco polo pone popa poro posa pozo puma pura puro
rama rana rata raya rayo real reja remo reno reto reza rezo rico rima risa rizo roba robo roca roer rojo rosa rubi ruta
saca saco sala sale sana sano sapo seca seco seda sede seis seta sigo sola solo sopa soga suba sube subo suma sumo
taco tapa taza tela tema teme tiza tina tipo tira tiro toca toco toda todo toma tomo tono tope toro tras tren tres tuba tubo tuna
unir unos urna usar util uvas vaca vale vaso vela velo vena vida viga vino vive vivo voto yate yema yeso yoga zona zumo
`
	.trim()
	.split(/\s+/);

/** Palabras de partida: concretas y conocidas. El juego usa las que quedan a 3–6 pasos de la meta. */
export const INICIOS = `
luna gato pato vino foco nube lobo toro faro pino rosa sopa taco mole piña coco pera lima nido rana rayo humo roca isla lago pozo nave moto tren
bici mapa foto cine dado bola bota vela vaso taza olla tapa cubo tubo pila lupa flor miel nuez puma buzo yate yoga arco arte aula auto boda
bote ceja cera cero club codo copa coro cruz cuna dedo diez duna euro fama fila foca goma gota hada hilo hoja hora hoyo idea iman jefe joya juez
jugo lana lazo leña leon lino loro mago mano mazo mesa mina moda mono mora muro nabo nata niño nota nudo obra ocho onda pala palo pelo piel
pipa piso polo rama reno remo risa rizo ruta sapo seda seta soga suma tela tiza tina tipo tono tuna uvas vena vida viga voto yema yeso zona zumo
`
	.trim()
	.split(/\s+/);
