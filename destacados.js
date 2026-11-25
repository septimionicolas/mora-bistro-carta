/* Productos destacados de la portada.
 *
 * Para sumar uno, copiá un bloque y completá:
 *   id         nombre corto, único
 *   modelo     versión liviana para la portada (modelos/hero/, ≤ 1,2 MB)
 *   modeloAR   original para «Ver en su mesa» (Android / visor)    — omitir si no hay AR
 *   modeloIos  original .usdz para iPhone                            — omitir si no hay AR
 *   camara     orbita (giro, inclinación, distancia), fov y escala del objeto
 *   origen     línea chica de arriba (ES / EN / PT)
 *   nombre     nombre del producto, con la tipografía de los platos
 *   linea      el plato o servicio que lo usa
 *   destino    id del elemento de la carta al que lleva «Ver en la carta»
 *   depto      (opcional) departamento que se marca en el mapa de origen
 *
 * Los modelos son ilustrativos: no son el plato real del bistró.
 */
var DESTACADOS = [
  {
    id: 'limon',
    modelo: 'modelos/hero/limon.glb',
    modeloAR: 'modelos/limon.glb', modeloIos: 'modelos/limon.usdz',
    camara: { orbita: '25deg 72deg 138%', fov: '28deg', escala: '1 1 1' },
    origen: { es: 'Origen · Tafí Viejo', en: 'Origin · Tafí Viejo', pt: 'Origem · Tafí Viejo' },
    nombre: { es: 'Limones de Tafí Viejo', en: 'Tafí Viejo lemons', pt: 'Limões de Tafí Viejo' },
    linea: {
      es: 'Paso 3 · Lomo con costra de limón',
      en: 'Course 3 · Beef tenderloin in a lemon crust',
      pt: 'Etapa 3 · Filé mignon em crosta de limão'
    },
    destino: 'paso-3', depto: 'tafi-viejo'
  },
  {
    id: 'torta-zanahoria-nueces',
    modelo: 'modelos/hero/torta-zanahoria-nueces.glb',
    modeloAR: 'modelos/torta-zanahoria-nueces.glb', modeloIos: 'modelos/torta-zanahoria-nueces.usdz',
    camara: { orbita: '30deg 66deg 122%', fov: '28deg', escala: '1 1 1' },
    origen: { es: 'Origen · Trancas', en: 'Origin · Trancas', pt: 'Origem · Trancas' },
    nombre: {
      es: 'Cayote y nueces de San Pedro de Colalao',
      en: 'Cayote and walnuts from San Pedro de Colalao',
      pt: 'Caiote e nozes de San Pedro de Colalao'
    },
    linea: {
      es: 'Paso 4 · Cheesecake de cayote y nueces, con miel de caña IG',
      en: 'Course 4 · Cayote and walnut cheesecake with sugar-cane honey (PGI)',
      pt: 'Etapa 4 · Cheesecake de caiote e nozes, com melado de cana (IG)'
    },
    destino: 'paso-4', depto: 'trancas'
  },
  {
    /* Etiqueta en blanco en la versión de portada: el modelo original trae una marca inventada.
       Sin «Ver en su mesa» por el mismo motivo (el original la mostraría). */
    id: 'vino-tinto-botella',
    modelo: 'modelos/hero/vino-tinto-botella.glb',
    camara: { orbita: '20deg 80deg 128%', fov: '26deg', escala: '1 1 1' },
    origen: { es: 'Origen · Colalao del Valle', en: 'Origin · Colalao del Valle', pt: 'Origem · Colalao del Valle' },
    nombre: { es: 'Malbec de altura', en: 'High-altitude Malbec', pt: 'Malbec de altitude' },
    linea: {
      es: 'Una copa incluida en el menú de pasos',
      en: 'A glass included in the tasting menu',
      pt: 'Uma taça incluída no menu degustação'
    },
    destino: 'pasos-incluye'
  },
  {
    id: 'medialuna',
    modelo: 'modelos/hero/medialuna.glb',
    modeloAR: 'modelos/medialuna.glb', modeloIos: 'modelos/medialuna.usdz',
    camara: { orbita: '30deg 62deg 105%', fov: '28deg', escala: '1 1 1' },
    origen: { es: 'Desayuno · 06:30 a 10:30', en: 'Breakfast · 6:30 to 10:30 am', pt: 'Café da manhã · 6h30 às 10h30' },
    nombre: { es: 'Medialunas', en: 'Medialunas', pt: 'Medialunas' },
    linea: {
      es: 'En el desayuno de Mora · carta completa muy pronto',
      en: 'At breakfast in Mora · full menu coming soon',
      pt: 'No café da manhã do Mora · cardápio completo em breve'
    },
    destino: 'prox-desayuno'
  }
];

/* Textos de la portada. */
var TEXTOS_PORTADA = {
  es: {
    region: 'Productos destacados', destacado: function (i, n) { return 'Destacado ' + i + ' de ' + n; },
    anterior: 'Destacado anterior', siguiente: 'Destacado siguiente',
    verCarta: 'Ver en la carta', verMesa: 'Ver en su mesa', ilustrativo: 'Modelo ilustrativo', logo: 'Mora Bistró Argentino'
  },
  en: {
    region: 'Featured products', destacado: function (i, n) { return 'Featured ' + i + ' of ' + n; },
    anterior: 'Previous', siguiente: 'Next',
    verCarta: 'See on the menu', verMesa: 'See it on your table', ilustrativo: 'Illustrative model', logo: 'Mora Bistró Argentino'
  },
  pt: {
    region: 'Produtos em destaque', destacado: function (i, n) { return 'Destaque ' + i + ' de ' + n; },
    anterior: 'Destaque anterior', siguiente: 'Próximo destaque',
    verCarta: 'Ver no cardápio', verMesa: 'Ver na sua mesa', ilustrativo: 'Modelo ilustrativo', logo: 'Mora Bistró Argentino'
  }
};
