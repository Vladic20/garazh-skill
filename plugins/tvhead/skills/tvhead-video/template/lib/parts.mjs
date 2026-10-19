// Catalog of character parts and environments the engine can draw (engine/looks.js, engine/sets.js).
// Used by the app ("what Claude builds from") and kept in sync with references/cast-and-world.md.
export const PARTS = {
  head:    { tv: 'телевизор', crt: 'старый ТВ', monitor: 'монитор', phone: 'телефон', mask: 'маска', round: 'круглая голова', cat: 'кот', bulb: 'лампочка', cloud: 'облако', box: 'коробка', robot: 'робот' },
  body:    { dress: 'платье-трапеция', robe: 'рваная мантия', suit: 'костюм', hoodie: 'худи', coat: 'пальто', labcoat: 'халат', shirt: 'футболка', apron: 'фартук', stick: 'палочка' },
  hat:     { beanie: 'шапка', cap: 'кепка', tophat: 'цилиндр', crown: 'корона', hardhat: 'каска', party: 'колпак', chef: 'поварской', grad: 'выпускной', cowboy: 'ковбойская', headphones: 'наушники', halo: 'нимб', bow: 'бант', wizard: 'волшебник', hood: 'капюшон' },
  glasses: { round: 'круглые', square: 'квадратные', sun: 'тёмные', monocle: 'монокль', vr: 'VR-очки' },
  neck:    { tie: 'галстук', bowtie: 'бабочка', scarf: 'шарф', medal: 'медаль', badge: 'бейдж' },
  back:    { backpack: 'рюкзак', cape: 'плащ', wings: 'крылья', jetpack: 'джетпак' },
  hair:    { short: 'короткие', long: 'длинные', bun: 'пучок', spiky: 'ёжик', curly: 'кудри' },
  hold:    { phone: 'телефон', heart: 'сердце', balloon: 'шарик', coffee: 'кофе', flower: 'цветок', briefcase: 'портфель', umbrella: 'зонт', book: 'книга', key: 'ключ', star: 'звезда', magnifier: 'лупа', trophy: 'кубок', pencil: 'карандаш', money: 'деньги', 'sign:…': 'табличка', 'flag:…': 'флаг' },
  set:     { room: 'комната', bedroom: 'спальня', office: 'офис', classroom: 'класс', cafe: 'кафе', kitchen: 'кухня', city: 'город', street: 'улица', subway: 'метро', forest: 'лес', park: 'парк', sea: 'море', mountains: 'горы', desert: 'пустыня', space: 'космос', stage: 'сцена' },
  weather: { rain: 'дождь', snow: 'снег', leaves: 'листопад', wind: 'ветер' },
};
