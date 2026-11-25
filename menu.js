/* Mora Bistró Argentino · carta digital
 * Datos de la carta. Para cambiar un precio, editá el número de `precio` del plato (sin puntos ni signo $).
 * Fuente de verdad: fuentes/carta-transcripta.md (fotos de la carta del 24/11/2026).
 *
 * Marcas internas (no se muestran raras al comensal):
 *   verificar: true          precio dudoso en la foto (hoja de bebidas movida); confirmar con el hotel.
 *   maridaje_propuesto: true maridaje sugerido por estilo, propuesto por nosotros; lo valida el hotel.
 *   origen_confirmar: true   el producto figura en el mapa de origen del menú de pasos, pero la carta
 *                            no dice que este plato use ese mismo proveedor; confirmar con cocina.
 *   foto / fotoMini          ruta prevista; si el archivo no existe, la ficha oculta la imagen sola.
 *   modelo                   ruta a un .glb para «Ver en su mesa»; vacío = sin botón.
 *   modeloIos                ruta a un .usdz para iPhone/iPad (opcional; sin él, iOS no ofrece AR).
 */

/* Configuración que completa el hotel. Vacío = ese botón no se muestra
   (Google usa la búsqueda de la ficha en Maps hasta que haya enlace directo de reseña). */
var CONFIG = {
  resenas: {
    // Búsqueda de la ficha en Google Maps; cambiar por el enlace directo «Escribir una reseña» cuando el hotel lo pase.
    google: 'https://www.google.com/maps/search/?api=1&query=Mora+Bistro+Argentino+Sheraton+Tucuman',
    tripadvisor: ''  // enlace "Escribir una opinión" de TripAdvisor
  },
  gerente: {
    email: '',       // p. ej. 'gerencia.mora@ejemplo.com' → abre mailto:
    whatsapp: ''     // solo números con código de país, p. ej. '5493810000000' → abre wa.me
  },
  instagram: 'morabistroargentino',
  zonaHoraria: 'America/Argentina/Tucuman'
};

/* Horarios de la carta. Minutos desde 00:00; si `hasta` es menor que `desde`, cruza la medianoche. */
var HORARIOS = [
  { id: 'desayuno', desde: '06:30', hasta: '10:30', hastaFinde: '11:00', seccion: '' }, // sin carta propia todavía: «Ahora» muestra sólo el horario
  { id: 'almuerzo', desde: '12:30', hasta: '16:00', seccion: 'menu' },
  { id: 'cena', desde: '20:00', hasta: '00:30', seccion: 'menu' },
  { id: 'lobby', desde: '08:00', hasta: '02:00', seccion: 'bebidas' },
  { id: 'room', desde: '16:00', hasta: '03:00', seccion: 'entradas', verificar: true } // carta: «aprox.»
];

/* Departamentos con producto en el mapa «Productos y origen» de la carta. */
var ORIGENES = {
  'trancas': {
    productos: [
      { es: 'Carne', en: 'Beef', pt: 'Carne bovina' },
      { es: 'Cayote y nueces', en: 'Cayote and walnuts', pt: 'Caiote e nozes', lugar: 'San Pedro de Colalao' }
    ]
  },
  'tafi-del-valle': {
    productos: [
      { es: 'Quesos', en: 'Cheeses', pt: 'Queijos', ig: true },
      { es: 'Vino Malbec de altura', en: 'High-altitude Malbec', pt: 'Malbec de altitude', lugar: 'Colalao del Valle' }
    ]
  },
  'burruyacu': {
    productos: [
      { es: 'Higos', en: 'Figs', pt: 'Figos' },
      { es: 'Naranjas', en: 'Oranges', pt: 'Laranjas' },
      { es: 'Quinotos', en: 'Kumquats (quinotos)', pt: 'Quinotos (kumquats)' }
    ]
  },
  'tafi-viejo': {
    productos: [
      { es: 'Limones', en: 'Lemons', pt: 'Limões' },
      { es: 'Naranjas', en: 'Oranges', pt: 'Laranjas' },
      { es: 'Quinotos', en: 'Kumquats (quinotos)', pt: 'Quinotos (kumquats)' },
      { es: 'Miel de abeja', en: 'Honey', pt: 'Mel', ig: true }
    ]
  },
  'lules': {
    productos: [{ es: 'Arándanos', en: 'Blueberries', pt: 'Mirtilos' }]
  },
  'alberdi': {
    productos: [{ es: 'Naranjas', en: 'Oranges', pt: 'Laranjas' }]
  },
  'graneros': {
    productos: [{ es: 'Trigo', en: 'Wheat', pt: 'Trigo' }]
  }
};

/* La carta marca la miel de caña con IG pero no le asigna departamento. */
var ORIGEN_SIN_DEPTO = { es: 'Miel de caña', en: 'Sugar-cane honey', pt: 'Melado de cana', ig: true };

var NOMBRES_DEPTO = {
  'trancas': 'Trancas', 'burruyacu': 'Burruyacú', 'tafi-del-valle': 'Tafí del Valle', 'tafi-viejo': 'Tafí Viejo',
  'capital': 'Capital', 'yerba-buena': 'Yerba Buena', 'cruz-alta': 'Cruz Alta', 'lules': 'Lules',
  'famailla': 'Famaillá', 'leales': 'Leales', 'monteros': 'Monteros', 'simoca': 'Simoca',
  'chicligasta': 'Chicligasta', 'rio-chico': 'Río Chico', 'alberdi': 'Alberdi', 'graneros': 'Graneros',
  'la-cocha': 'La Cocha'
};

/* Menú de pasos «Tucumán a la carta» (temporada invierno). */
var MENU_PASOS = {
  id: 'menu-pasos',
  precio: 38000,
  pasos: [
    {
      id: 'paso-1', origen: ['tafi-del-valle', 'burruyacu', 'tafi-viejo'],
      es: 'Degustación de quesos de Tafí IG, con fondue y tortilla al rescoldo, higos y mermelada de quinotos.',
      en: 'A tasting of Tafí cheeses (PGI) with fondue and tortilla al rescoldo, a flatbread baked in the embers, served with figs and kumquat jam.',
      pt: 'Degustação de queijos de Tafí (IG) com fondue e tortilla al rescoldo, pão achatado assado nas brasas, figos e geleia de quinotos.'
    },
    {
      id: 'paso-2', origen: ['trancas'],
      es: 'Empanada frita de matambre, con jugo de limón.',
      en: 'Fried matambre empanada (matambre is a thin Argentine beef cut), finished with fresh lemon juice.',
      pt: 'Empanada frita de matambre (corte bovino fino, típico argentino), com suco de limão.'
    },
    {
      id: 'paso-3', origen: ['trancas', 'tafi-viejo', 'graneros', 'tafi-del-valle', 'lules'],
      es: 'Lomo con costra de limón, risotto de trigo y salsa Malbec de vino de altura con arándanos.',
      en: 'Beef tenderloin in a lemon crust, wheat risotto and a high-altitude Malbec sauce with blueberries.',
      pt: 'Filé mignon em crosta de limão, risoto de trigo e molho de Malbec de altitude com mirtilos.'
    },
    {
      id: 'paso-4', origen: ['trancas'], ig_extra: true, modelo: '',
      es: 'Cheesecake de cayote y nueces, con miel de caña IG.',
      en: 'Cayote and walnut cheesecake with sugar-cane honey (PGI). Cayote is an Andean squash traditionally candied in the north.',
      pt: 'Cheesecake de caiote e nozes, com melado de cana (IG). O caiote é uma abóbora andina, tradicionalmente cristalizada no norte.'
    }
  ],
  incluye: {
    es: 'Incluye una copa de vino de bodegas tucumanas de los Valles Calchaquíes (Finca la Orilla, Los Zazos, Río de Arena) y una bebida sin alcohol.',
    en: 'Includes a glass of wine from Tucumán wineries in the Calchaquí Valleys (Finca la Orilla, Los Zazos, Río de Arena) and a soft drink.',
    pt: 'Inclui uma taça de vinho de vinícolas tucumanas dos Vales Calchaquíes (Finca la Orilla, Los Zazos, Río de Arena) e uma bebida sem álcool.'
  }
};

/* Maridajes por estilo (sin etiquetas). Todos maridaje_propuesto: true. */
var M = {
  malbec: { es: 'Malbec de altura', en: 'High-altitude Malbec', pt: 'Malbec de altitude' },
  torrontes: { es: 'Torrontés de los Valles Calchaquíes', en: 'Torrontés from the Calchaquí Valleys', pt: 'Torrontés dos Vales Calchaquíes' },
  cabernet: { es: 'Cabernet Sauvignon', en: 'Cabernet Sauvignon', pt: 'Cabernet Sauvignon' },
  bonarda: { es: 'Bonarda', en: 'Bonarda', pt: 'Bonarda' },
  rosado: { es: 'Rosado de Malbec', en: 'Malbec rosé', pt: 'Rosé de Malbec' },
  chardonnay: { es: 'Chardonnay', en: 'Chardonnay', pt: 'Chardonnay' },
  pinot: { es: 'Pinot Noir', en: 'Pinot Noir', pt: 'Pinot Noir' },
  sauvignon: { es: 'Sauvignon Blanc', en: 'Sauvignon Blanc', pt: 'Sauvignon Blanc' },
  blend: { es: 'Blend tinto de guarda', en: 'Aged red blend', pt: 'Blend tinto de guarda' }
};

var SECCIONES = [
  {
    id: 'entradas',
    titulo: { es: 'Entradas', en: 'Starters', pt: 'Entradas' },
    items: [
      { id: 'empanada-carne', precio: 4800, modelo: '',
        nombre: { es: 'Empanada de carne', en: 'Beef empanada', pt: 'Empanada de carne' },
        desc: { es: '', en: 'The classic Argentine filled pastry.', pt: 'O clássico salgado recheado argentino.' } },
      { id: 'empanada-pollo', precio: 4800,
        nombre: { es: 'Empanada de pollo', en: 'Chicken empanada', pt: 'Empanada de frango' },
        desc: { es: '', en: '', pt: '' } },
      { id: 'empanada-queso', precio: 4600,
        nombre: { es: 'Empanada de queso, cebolla y aceitunas', en: 'Cheese, onion and olive empanada', pt: 'Empanada de queijo, cebola e azeitonas' },
        desc: { es: '', en: '', pt: '' } },
      { id: 'humita', precio: 15000, tags: ['sintacc'],
        nombre: { es: 'Humita', en: 'Humita', pt: 'Humita' },
        desc: { es: 'Con queso cremoso y fritillo.',
                en: 'Creamed fresh corn, a northern Argentine classic, with soft cheese and fritillo, a paprika and onion sofrito.',
                pt: 'Creme de milho verde, clássico do norte argentino, com queijo cremoso e fritillo, refogado de cebola e páprica.' } },
      { id: 'mollejas', precio: 24500, modelo: '',
        maridaje: M.torrontes, maridaje_propuesto: true,
        nombre: { es: 'Mollejas a la plancha', en: 'Griddled sweetbreads', pt: 'Mollejas na chapa' },
        desc: { es: 'Con crema de verdeo y papas pay.',
                en: 'With spring onion cream and shoestring potatoes.',
                pt: 'Timo bovino na chapa, com creme de cebolinha e batata palha.' } },
      { id: 'provoleta', precio: 28900, tags: ['sintacc'], origen: ['tafi-del-valle'],
        modelo: '',
        maridaje: M.malbec, maridaje_propuesto: true,
        nombre: { es: 'Provoleta de Tafí rebozada', en: 'Crumbed Tafí provoleta', pt: 'Provoleta de Tafí empanada' },
        desc: { es: 'Queso de Tafí del Valle rebozado, con mermelada de pimientos picantes.',
                en: 'Provolone-style cheese from Tafí del Valle, crumbed and golden, with spicy red pepper jam.',
                pt: 'Queijo tipo provolone de Tafí del Valle, empanado e dourado, com geleia de pimentões picantes.' } }
    ]
  },
  {
    id: 'sopas',
    titulo: { es: 'Sopas', en: 'Soups', pt: 'Sopas' },
    items: [
      { id: 'sopa-puerro', precio: 16000, tags: ['sintacc', 'vegano'],
        nombre: { es: 'Puerro y papas', en: 'Leek and potato', pt: 'Alho-poró e batata' },
        desc: { es: '', en: '', pt: '' } },
      // La carta marca esta sopa como vegana, pero la descripción dice «crema»: no se marca vegana. // confirmar con cocina
      { id: 'sopa-calabaza', precio: 16000, tags: ['sintacc'], foto: 'fotos/sopa-crema-de-calabaza.jpg', fotoMini: 'fotos/sopa-crema-de-calabaza-s.jpg', modelo: '',
        nombre: { es: 'Crema de calabaza asada', en: 'Roasted squash velouté', pt: 'Creme de abóbora assada' },
        desc: { es: 'Zapallo cabutia asado, terminado con crema.',
                en: 'Roasted kabocha squash, finished with cream.',
                pt: 'Abóbora cabotiá assada, finalizada com creme de leite.' } },
      { id: 'sopa-pollo', precio: 16000, tags: ['sintacc'],
        nombre: { es: 'Crema de pollo y choclo', en: 'Cream of chicken and sweetcorn', pt: 'Creme de frango e milho' },
        desc: { es: 'Pollo y choclo salteados, con verdeo.',
                en: 'Sautéed chicken and sweetcorn with spring onion.',
                pt: 'Frango e milho salteados, com cebolinha.' } }
    ]
  },
  {
    id: 'ensaladas',
    titulo: { es: 'Ensaladas', en: 'Salads', pt: 'Saladas' },
    items: [
      { id: 'caesar', precio: 20000, foto: 'fotos/ensalada-caesar.jpg', fotoMini: 'fotos/ensalada-caesar-s.jpg', modelo: '',
        nombre: { es: 'Caesar tradicional', en: 'Classic Caesar', pt: 'Caesar clássica' },
        desc: { es: '', en: '', pt: '' } },
      { id: 'caesar-salmon', precio: 38500,
        nombre: { es: 'Caesar con salmón ahumado', en: 'Caesar with smoked salmon', pt: 'Caesar com salmão defumado' },
        desc: { es: '', en: '', pt: '' } },
      { id: 'caesar-langostinos', precio: 25000,
        nombre: { es: 'Caesar con langostinos', en: 'Caesar with prawns', pt: 'Caesar com lagostins' },
        desc: { es: '', en: '', pt: '' } },
      { id: 'fresca-del-rio', precio: 34000, tags: ['sintacc'],
        origen: ['tafi-viejo', 'burruyacu', 'alberdi'], origen_confirmar: true, // naranjas del mapa; confirmar con cocina
        maridaje: M.torrontes, maridaje_propuesto: true,
        nombre: { es: 'Fresca del Río', en: 'Fresca del Río', pt: 'Fresca del Río' },
        desc: { es: 'Trucha ahumada, rúcula, naranja, palta y jengibre encurtido.',
                en: 'Smoked trout, rocket, orange, avocado and pickled ginger.',
                pt: 'Truta defumada, rúcula, laranja, abacate e gengibre em conserva.' } },
      { id: 'tibia', precio: 20500,
        nombre: { es: 'Tibia', en: 'Warm salad', pt: 'Salada morna' },
        desc: { es: 'Hojas verdes, pollo, brócoli, zanahoria, choclo y arroz, con salsa tasty.',
                en: 'Greens, chicken, broccoli, carrot, sweetcorn and rice, with tasty sauce.',
                pt: 'Folhas verdes, frango, brócolis, cenoura, milho e arroz, com molho tasty.' } }
    ]
  },
  {
    id: 'principales',
    titulo: { es: 'Principales', en: 'Main courses', pt: 'Pratos principais' },
    items: [
      { id: 'entrana', precio: 42500, maridaje: M.malbec, maridaje_propuesto: true,
        nombre: { es: 'Entraña rellena', en: 'Stuffed skirt steak', pt: 'Entraña recheada' },
        desc: { es: 'Con papas bastón y relish de pepinos.',
                en: 'With French fries and cucumber relish.',
                pt: 'Corte do diafragma bovino, com batatas palito e relish de pepino.' } },
      // Corte a confirmar con cocina (costillar vacuno o de cerdo).
      { id: 'costillar', precio: 34500, foto: 'fotos/costillar.jpg', fotoMini: 'fotos/costillar-s.jpg', modelo: '',
        maridaje: M.cabernet, maridaje_propuesto: true,
        nombre: { es: 'Costillar', en: 'Rack of ribs', pt: 'Costela' },
        desc: { es: 'Con puré aligot y demi-glace.',
                en: 'With aligot (cheese and potato purée) and demi-glace.',
                pt: 'Com purê aligot (batata com queijo) e demi-glace.' } },
      { id: 'milanesa', precio: 39000, maridaje: M.bonarda, maridaje_propuesto: true,
        nombre: { es: 'Milanesa de ojo de bife a la napolitana', en: 'Ribeye milanesa napolitana', pt: 'Milanesa de ribeye à napolitana' },
        desc: { es: 'Con papas al ajillo.',
                en: 'Breaded ribeye topped with ham, tomato sauce and melted cheese, with garlic potatoes.',
                pt: 'Ribeye empanado, coberto com presunto, molho de tomate e queijo gratinado, com batatas ao alho.' } },
      { id: 'bondiola', precio: 23000, tags: ['sintacc'],
        origen: ['trancas'], origen_confirmar: true, // cayote del mapa; confirmar con cocina
        maridaje: M.rosado, maridaje_propuesto: true,
        nombre: { es: 'Bondiola de cerdo rellena', en: 'Stuffed pork shoulder', pt: 'Copa-lombo suíno recheado' },
        desc: { es: 'Con puré de boniato al toffee y chutney de cayote.',
                en: 'Sweet potato and toffee purée with cayote chutney. Cayote is an Andean squash from the north of Argentina.',
                pt: 'Purê de batata-doce com toffee e chutney de caiote, abóbora andina do norte argentino.' } },
      { id: 'filet-relleno', precio: 42000, maridaje: M.malbec, maridaje_propuesto: true,
        nombre: { es: 'Filet de lomo relleno', en: 'Stuffed beef tenderloin', pt: 'Filé mignon recheado' },
        desc: { es: 'Con farsa de chorizo y polenta cremosa.',
                en: 'Chorizo farce and creamy polenta.',
                pt: 'Recheio de linguiça chorizo e polenta cremosa.' } },
      { id: 'pollo-relleno', precio: 22500, maridaje: M.chardonnay, maridaje_propuesto: true,
        nombre: { es: 'Pollo relleno', en: 'Stuffed chicken', pt: 'Frango recheado' },
        desc: { es: 'De jamón crudo y queso, con milhojas de zapallo coreano y salsa de espinacas.',
                en: 'Filled with prosciutto and cheese, with a Korean squash mille-feuille and spinach sauce.',
                pt: 'Recheado com presunto cru e queijo, mil-folhas de abóbora coreana e molho de espinafre.' } },
      { id: 'salmon', precio: 58000, foto: 'fotos/salmon-rosado.jpg', fotoMini: 'fotos/salmon-rosado-s.jpg', modelo: '',
        maridaje: M.pinot, maridaje_propuesto: true,
        nombre: { es: 'Salmón rosado', en: 'Pink salmon', pt: 'Salmão rosado' },
        desc: { es: 'Con risotto de leche y salsa cítrica.',
                en: 'With a creamy milk risotto and citrus sauce.',
                pt: 'Com risoto ao leite e molho cítrico.' } },
      { id: 'ojo-de-bife', precio: 42000, modelo: 'modelos/ojo-de-bife.glb',
        maridaje: M.malbec, maridaje_propuesto: true,
        nombre: { es: 'Ojo de bife', en: 'Ribeye steak', pt: 'Bife ancho' },
        desc: { es: 'Con chimichurri y verduras grilladas.',
                en: 'With chimichurri and grilled vegetables.',
                pt: 'Com chimichurri e legumes grelhados.' } },
      { id: 'cazuela', precio: 23000, maridaje: M.bonarda, maridaje_propuesto: true,
        nombre: { es: 'Cazuela de lomo al estilo andino', en: 'Andean-style beef casserole', pt: 'Caçarola de filé à moda andina' },
        desc: { es: 'Lomo en dados, vegetales, salchichas estilo alemán, papas y huevo.',
                en: 'Diced tenderloin, vegetables, German-style sausages, potatoes and egg.',
                pt: 'Filé em cubos, legumes, salsichas tipo alemãs, batatas e ovo.' } },
      { id: 't-bone', precio: 79000, tags: ['compartir'], foto: 'fotos/t-bone.jpg', fotoMini: 'fotos/t-bone-s.jpg', modelo: 'modelos/t-bone.glb',
        maridaje: M.cabernet, maridaje_propuesto: true,
        nombre: { es: 'T-bone', en: 'T-bone steak', pt: 'T-bone' },
        desc: { es: 'Para compartir. Con papas, vegetales y huevo.',
                en: 'To share. With potatoes, vegetables and egg.',
                pt: 'Para compartilhar. Com batatas, legumes e ovo.' } },
      { id: 'tomahawk', precio: 80000, tags: ['compartir'], modelo: 'modelos/tomahawk.glb', modeloIos: 'modelos/tomahawk.usdz',
        maridaje: M.blend, maridaje_propuesto: true,
        nombre: { es: 'Tomahawk', en: 'Tomahawk steak', pt: 'Tomahawk' },
        desc: { es: 'Para compartir. Con papas y vegetales.',
                en: 'To share. With potatoes and vegetables.',
                pt: 'Para compartilhar. Com batatas e legumes.' } }
    ]
  },
  {
    id: 'compartir',
    titulo: { es: 'Para compartir', en: 'To share', pt: 'Para compartilhar' },
    items: [
      { id: 'tabla', precio: 30000, tags: ['sintacc', 'compartir'], foto: 'fotos/tabla-quesos-embutidos.jpg', fotoMini: 'fotos/tabla-quesos-embutidos-s.jpg', modelo: 'modelos/tabla-quesos.glb',
        maridaje: M.torrontes, maridaje_propuesto: true,
        nombre: { es: 'Tabla de quesos y embutidos regionales', en: 'Regional cheese and cold cuts board', pt: 'Tábua de queijos e frios regionais' },
        desc: { es: '', en: '', pt: '' } }
    ]
  },
  {
    id: 'pastas',
    titulo: { es: 'Pastas y risottos', en: 'Pasta and risotto', pt: 'Massas e risotos' },
    items: [
      // La carta lo marca vegano; confirmar con cocina que no lleva manteca ni queso.
      { id: 'risotto-espinaca', precio: 18000, tags: ['vegano'],
        nombre: { es: 'Risotto de espinaca y vegetales', en: 'Spinach and vegetable risotto', pt: 'Risoto de espinafre e legumes' },
        desc: { es: '', en: '', pt: '' } },
      { id: 'sorrentinos-jamon', precio: 17000, modelo: '',
        nombre: { es: 'Sorrentinos de jamón y queso', en: 'Ham and cheese sorrentinos', pt: 'Sorrentinos de presunto e queijo' },
        desc: { es: 'Con salsa rosa de remolacha y zanahoria.',
                en: 'Large round filled pasta, an Argentine favourite, with a beetroot and carrot rosé sauce.',
                pt: 'Massa recheada redonda, típica argentina, com molho rosé de beterraba e cenoura.' } },
      { id: 'fideos-azafran', precio: 17500, maridaje: M.sauvignon, maridaje_propuesto: true,
        nombre: { es: 'Cintas caseras al azafrán con mariscos', en: 'House-made saffron tagliatelle with seafood', pt: 'Talharim caseiro ao açafrão com frutos do mar' },
        desc: { es: 'Cintas al huevo con camarones y mejillones.',
                en: 'Egg ribbons with shrimp and mussels.',
                pt: 'Massa de ovos com camarões e mexilhões.' } },
      { id: 'panzottis-pollo', precio: 23000,
        nombre: { es: 'Panzottis de pollo y verduras', en: 'Chicken and vegetable panzotti', pt: 'Panzotti de frango e legumes' },
        desc: { es: 'Con salsa de hongos.', en: 'With mushroom sauce.', pt: 'Com molho de cogumelos.' } },
      { id: 'sorrentinos-vacio', precio: 21000, maridaje: M.malbec, maridaje_propuesto: true,
        nombre: { es: 'Sorrentinos de vacío braseado', en: 'Braised flank sorrentinos', pt: 'Sorrentinos de vazio braseado' },
        desc: { es: 'Con estofado de vegetales.', en: 'With a vegetable stew.', pt: 'Com ensopado de legumes.' } },
      { id: 'sorrentinos-quesos', precio: 17000,
        nombre: { es: 'Sorrentinos de cuatro quesos', en: 'Four-cheese sorrentinos', pt: 'Sorrentinos de quatro queijos' },
        desc: { es: 'Azul, gruyère, sardo y ricota, con crema de limón.',
                en: 'Blue cheese, Gruyère, sardo (an Argentine aged cheese) and ricotta, with lemon cream.',
                pt: 'Queijo azul, gruyère, sardo (queijo curado argentino) e ricota, com creme de limão.' } },
      { id: 'agnolotis', precio: 18500, maridaje: M.malbec, maridaje_propuesto: true,
        nombre: { es: 'Agnolotis de cabrito braseado', en: 'Braised kid goat agnolotti', pt: 'Agnolotti de cabrito braseado' },
        desc: { es: 'Con demi-glace.', en: 'With demi-glace.', pt: 'Com demi-glace.' } },
      { id: 'risotto-mar', precio: 29000, foto: 'fotos/risotto-de-mar.jpg', fotoMini: 'fotos/risotto-de-mar-s.jpg', modelo: '',
        maridaje: M.torrontes, maridaje_propuesto: true,
        nombre: { es: 'Risotto de mar', en: 'Seafood risotto', pt: 'Risoto de frutos do mar' },
        desc: { es: 'Salmón, langostinos, camarones, mejillones y calamar.',
                en: 'Salmon, prawns, shrimp, mussels and squid.',
                pt: 'Salmão, lagostins, camarões, mexilhões e lula.' } },
      { id: 'panzotti-verduras', precio: 17000,
        nombre: { es: 'Panzotti de verduras', en: 'Vegetable panzotti', pt: 'Panzotti de legumes' },
        desc: { es: 'Con velouté de puerros.', en: 'With leek velouté.', pt: 'Com velouté de alho-poró.' } },
      { id: 'pappardelle', precio: 17500,
        nombre: { es: 'Pappardelle ripiene', en: 'Filled pappardelle', pt: 'Pappardelle recheado' },
        desc: { es: 'Con ragú blanco de pollo.', en: 'With a white chicken ragù.', pt: 'Com ragu branco de frango.' } }
    ]
  }
];

/* Bebidas. Las de sin alcohol y cervezas salen de una foto movida («precios aprox.»): verificar: true. */
var BEBIDAS = {
  id: 'bebidas',
  titulo: { es: 'Bebidas', en: 'Drinks', pt: 'Bebidas' },
  grupos: [
    {
      id: 'sin-alcohol',
      titulo: { es: 'Sin alcohol', en: 'Soft drinks', pt: 'Sem álcool' },
      items: [
        { id: 'agua', precio: 4300, verificar: true, nombre: { es: 'Agua', en: 'Water', pt: 'Água' } },
        { id: 'soda', precio: 4300, verificar: true, nombre: { es: 'Soda', en: 'Soda water', pt: 'Água com gás' } },
        { id: 'agua-saborizada', precio: 4300, verificar: true, nombre: { es: 'Agua saborizada', en: 'Flavoured water', pt: 'Água saborizada' } },
        { id: 'pepsi', precio: 4300, verificar: true, nombre: { es: 'Pepsi · Pepsi Light', en: 'Pepsi · Pepsi Light', pt: 'Pepsi · Pepsi Light' } },
        { id: 'seven-up', precio: 4300, verificar: true, nombre: { es: 'Seven Up · Seven Up Free', en: 'Seven Up · Seven Up Free', pt: 'Seven Up · Seven Up Free' } },
        { id: 'mirinda', precio: 4300, verificar: true, nombre: { es: 'Mirinda naranja', en: 'Mirinda orange', pt: 'Mirinda laranja' } },
        { id: 'licuados', precio: 6700, verificar: true, nombre: { es: 'Licuados de fruta', en: 'Fruit smoothies', pt: 'Batidos de frutas' } },
        { id: 'limonada', precio: 6700, verificar: true, nombre: { es: 'Limonada', en: 'Lemonade', pt: 'Limonada' } },
        { id: 'limonada-menta', precio: 7500, verificar: true, nombre: { es: 'Limonada con menta y jengibre', en: 'Mint and ginger lemonade', pt: 'Limonada com hortelã e gengibre' } }
      ]
    },
    {
      id: 'cervezas',
      titulo: { es: 'Cervezas', en: 'Beers', pt: 'Cervejas' },
      items: [
        { id: 'quilmes-473', precio: 7800, verificar: true, nombre: { es: 'Quilmes Clásica · 473 ml' } },
        { id: 'stella-473', precio: 9500, verificar: true, nombre: { es: 'Stella Artois · 473 ml' } },
        { id: 'stella-chalice-330', precio: 8700, verificar: true, nombre: { es: 'Stella Artois Chalice · 330 ml' } },
        { id: 'stella-chalice-250', precio: 7000, verificar: true, nombre: { es: 'Stella Artois Chalice · 250 ml' } },
        { id: 'stella-noire-410', precio: 10000, verificar: true, nombre: { es: 'Stella Artois Noire · 410 ml' } },
        { id: 'andes-473', precio: 8000, verificar: true, nombre: { es: 'Andes · 473 ml' } },
        { id: 'patagonia-710', precio: 16200, verificar: true, nombre: { es: 'Patagonia · 710 ml' } },
        { id: 'corona-330', precio: 7000, verificar: true, nombre: { es: 'Corona · 330 ml' } },  // «?» en la foto
        { id: 'corona-410', precio: 11500, verificar: true, nombre: { es: 'Corona · 410 ml' } }, // «?» en la foto
        { id: 'walnuss', precio: 9200, verificar: true, nombre: { es: 'Walnuss' } }              // «?» en la foto
      ]
    },
    {
      id: 'tragos',
      titulo: { es: 'Tragos', en: 'Cocktails', pt: 'Drinques' },
      items: [
        { id: 'gin-tonic', precio: 13500, nombre: { es: 'Gin tonic clásico', en: 'Classic gin and tonic', pt: 'Gim-tônica clássico' } },
        { id: 'aperol', precio: 13500, nombre: { es: 'Aperol Spritz' } },
        { id: 'mojito', precio: 12000, nombre: { es: 'Mojito' } },
        { id: 'fernet', precio: 12000, nombre: { es: 'Fernet Branca' } },
        { id: 'daiquiri', precio: 10000, nombre: { es: 'Daiquiri' } }
      ]
    }
  ]
};

/* Textos de la interfaz. */
var TEXTOS = {
  es: {
    titulo: 'Mora Bistró Argentino · Carta',
    descripcion: 'Carta de Mora Bistró Argentino, en Sheraton Tucumán. Cocina tucumana de producto, en español, inglés y portugués.',
    bistro: 'Bistró argentino', ubicacion: 'en Sheraton Tucumán · Av. Soldati 440',
    idioma: 'Idioma', tema: 'Tema', temaClaro: 'Marfil', temaOscuro: 'Cuero', temaAuto: 'Automático',
    temaCambiar: 'Cambiar a tema', navegacion: 'Secciones de la carta',
    ahora: 'Ahora', hasta: 'hasta', abre: 'Abre', cerrado: 'Cerrado por ahora', verServicio: 'Ver',
    servicios: { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena', lobby: 'Lobby bar', room: 'Room service' },
    filtros: 'Filtrar la carta', sintacc: 'Sin TACC', vegano: 'Vegano', compartir: 'Para compartir',
    filtroVacio: 'Ningún plato de esta sección coincide con el filtro.', limpiar: 'Quitar filtros',
    resultados: function (n) { return n === 1 ? '1 plato' : n + ' platos'; },
    navTucuman: 'Menú de pasos', navBebidas: 'Bebidas',
    tucumanTitulo: 'Menú de pasos', tucumanBajada: 'Tucumán a la carta',
    tucumanIntro: 'Cuatro pasos para recorrer la provincia desde la mesa: cada producto llega de un departamento de Tucumán.',
    paso: 'Paso', porPersona: 'por persona', mapaTitulo: 'Productos y origen', origenToggle: 'Origen de los productos',
    mapaAyuda: 'Toque un departamento resaltado para ver qué llega de allí.',
    mapaLista: 'Departamentos con producto', mapaVacio: 'Elija un departamento del mapa o de la lista.',
    mapaPlatos: 'En la carta', mapaPasos: 'En el menú de pasos', ig: 'IG', igLargo: 'Identificación geográfica',
    sinDepto: 'La miel de caña IG figura en la carta sin departamento.',
    origen: 'Origen', maridaje: 'Copa sugerida', verEnSuMesa: 'Ver en su mesa', modeloIlustrativo: 'Modelo ilustrativo', ilustrativa: 'Imagen ilustrativa',
    falasco: 'Con la compañía de Falasco Wines.',
    resenasTitulo: '¿Cómo estuvo su visita?', resenasTexto: 'Su opinión nos ayuda a cuidar cada detalle.',
    google: 'Opinar en Google', tripadvisor: 'Opinar en TripAdvisor', creditos: 'Créditos',
    gerenteTitulo: 'Hablar con el gerente', gerenteTexto: 'Si algo no estuvo a la altura, escríbanos en privado.',
    email: 'Correo', whatsapp: 'WhatsApp',
    horarios: 'Horarios', lav: 'Lunes a viernes', finde: 'Sábados, domingos y feriados', aprox: 'aprox.',
    direccion: 'Dirección', legal: 'Cubierto $1.000 · Precios en pesos argentinos · IVA incluido',
    instagram: 'Instagram', pasosNota: 'Precio por persona.', volverArriba: 'Volver al inicio'
  },
  en: {
    titulo: 'Mora Bistró Argentino · Menu',
    descripcion: 'Menu of Mora Bistró Argentino at Sheraton Tucumán. Produce-led Tucumán cooking, in Spanish, English and Portuguese.',
    bistro: 'Argentine bistro', ubicacion: 'at Sheraton Tucumán · Av. Soldati 440',
    idioma: 'Language', tema: 'Theme', temaClaro: 'Ivory', temaOscuro: 'Leather', temaAuto: 'Automatic',
    temaCambiar: 'Switch to theme', navegacion: 'Menu sections',
    ahora: 'Now', hasta: 'until', abre: 'Opens', cerrado: 'Closed for now', verServicio: 'View',
    servicios: { desayuno: 'Breakfast', almuerzo: 'Lunch', cena: 'Dinner', lobby: 'Lobby bar', room: 'Room service' },
    filtros: 'Filter the menu', sintacc: 'Gluten-free', vegano: 'Vegan', compartir: 'To share',
    filtroVacio: 'No dishes in this section match the filter.', limpiar: 'Clear filters',
    resultados: function (n) { return n === 1 ? '1 dish' : n + ' dishes'; },
    navTucuman: 'Tasting menu', navBebidas: 'Drinks',
    tucumanTitulo: 'Tasting menu', tucumanBajada: 'Tucumán a la carta',
    tucumanIntro: 'Four courses that travel across the province: every product comes from a department of Tucumán.',
    paso: 'Course', porPersona: 'per person', mapaTitulo: 'Produce and origin', origenToggle: 'Origin of the produce',
    mapaAyuda: 'Tap a highlighted department to see what comes from there.',
    mapaLista: 'Departments with produce', mapaVacio: 'Choose a department on the map or in the list.',
    mapaPlatos: 'On the menu', mapaPasos: 'In the tasting menu', ig: 'PGI', igLargo: 'Protected geographical indication',
    sinDepto: 'Sugar-cane honey (PGI) appears on the menu without a department.',
    origen: 'Origin', maridaje: 'Suggested glass', verEnSuMesa: 'See it on your table', modeloIlustrativo: 'Illustrative model', ilustrativa: 'Illustrative image',
    falasco: 'In the company of Falasco Wines.',
    resenasTitulo: 'How was your visit?', resenasTexto: 'Your feedback helps us look after every detail.',
    google: 'Review on Google', tripadvisor: 'Review on TripAdvisor', creditos: 'Credits',
    gerenteTitulo: 'Contact the manager', gerenteTexto: 'If anything fell short, write to us privately.',
    email: 'Email', whatsapp: 'WhatsApp',
    horarios: 'Opening hours', lav: 'Monday to Friday', finde: 'Saturdays, Sundays and holidays', aprox: 'approx.',
    direccion: 'Address', legal: 'Cover charge $1,000 · Prices in Argentine pesos · VAT included',
    instagram: 'Instagram', pasosNota: 'Price per person.', volverArriba: 'Back to top'
  },
  pt: {
    titulo: 'Mora Bistró Argentino · Cardápio',
    descripcion: 'Cardápio do Mora Bistró Argentino, no Sheraton Tucumán. Cozinha tucumana de produto, em espanhol, inglês e português.',
    bistro: 'Bistrô argentino', ubicacion: 'no Sheraton Tucumán · Av. Soldati 440',
    idioma: 'Idioma', tema: 'Tema', temaClaro: 'Marfim', temaOscuro: 'Couro', temaAuto: 'Automático',
    temaCambiar: 'Mudar para o tema', navegacion: 'Seções do cardápio',
    ahora: 'Agora', hasta: 'até', abre: 'Abre', cerrado: 'Fechado no momento', verServicio: 'Ver',
    servicios: { desayuno: 'Café da manhã', almuerzo: 'Almoço', cena: 'Jantar', lobby: 'Lobby bar', room: 'Serviço de quarto' },
    filtros: 'Filtrar o cardápio', sintacc: 'Sem glúten', vegano: 'Vegano', compartir: 'Para compartilhar',
    filtroVacio: 'Nenhum prato desta seção corresponde ao filtro.', limpiar: 'Limpar filtros',
    resultados: function (n) { return n === 1 ? '1 prato' : n + ' pratos'; },
    navTucuman: 'Menu degustação', navBebidas: 'Bebidas',
    tucumanTitulo: 'Menu degustação', tucumanBajada: 'Tucumán a la carta',
    tucumanIntro: 'Quatro etapas para percorrer a província à mesa: cada produto vem de um departamento de Tucumán.',
    paso: 'Etapa', porPersona: 'por pessoa', mapaTitulo: 'Produtos e origem', origenToggle: 'Origem dos produtos',
    mapaAyuda: 'Toque um departamento destacado para ver o que vem de lá.',
    mapaLista: 'Departamentos com produto', mapaVacio: 'Escolha um departamento no mapa ou na lista.',
    mapaPlatos: 'No cardápio', mapaPasos: 'No menu degustação', ig: 'IG', igLargo: 'Indicação geográfica',
    sinDepto: 'O melado de cana (IG) aparece no cardápio sem departamento.',
    origen: 'Origem', maridaje: 'Taça sugerida', verEnSuMesa: 'Ver na sua mesa', modeloIlustrativo: 'Modelo ilustrativo', ilustrativa: 'Imagem ilustrativa',
    falasco: 'Na companhia de Falasco Wines.',
    resenasTitulo: 'Como foi a sua visita?', resenasTexto: 'Sua opinião nos ajuda a cuidar de cada detalhe.',
    google: 'Avaliar no Google', tripadvisor: 'Avaliar no TripAdvisor', creditos: 'Créditos',
    gerenteTitulo: 'Falar com o gerente', gerenteTexto: 'Se algo não esteve à altura, escreva-nos em particular.',
    email: 'E-mail', whatsapp: 'WhatsApp',
    horarios: 'Horários', lav: 'Segunda a sexta', finde: 'Sábados, domingos e feriados', aprox: 'aprox.',
    direccion: 'Endereço', legal: 'Couvert $1.000 · Preços em pesos argentinos · Impostos incluídos',
    instagram: 'Instagram', pasosNota: 'Preço por pessoa.', volverArriba: 'Voltar ao início'
  }
};
