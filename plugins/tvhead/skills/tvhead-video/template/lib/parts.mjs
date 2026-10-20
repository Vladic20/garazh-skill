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
  set:     { room: 'комната', bedroom: 'спальня', office: 'офис', classroom: 'класс', cafe: 'кафе', kitchen: 'кухня', city: 'город', street: 'улица', subway: 'метро', forest: 'лес', park: 'парк', sea: 'море', mountains: 'горы', desert: 'пустыня', space: 'космос', stage: 'сцена', garage: 'гараж (мультик)', desk: 'стол крупно', blackout: 'темнота и прожектор' },
  weather: { rain: 'дождь', snow: 'снег', leaves: 'листопад', wind: 'ветер' },
};

// English labels for the app catalog (same keys)
export const PARTS_EN = {
  head:    { tv: 'TV', crt: 'old TV', monitor: 'monitor', phone: 'phone', mask: 'mask', round: 'round head', cat: 'cat', bulb: 'light bulb', cloud: 'cloud', box: 'box', robot: 'robot' },
  body:    { dress: 'trapezoid dress', robe: 'ragged robe', suit: 'suit', hoodie: 'hoodie', coat: 'coat', labcoat: 'lab coat', shirt: 't-shirt', apron: 'apron', stick: 'stick' },
  hat:     { beanie: 'beanie', cap: 'cap', tophat: 'top hat', crown: 'crown', hardhat: 'hard hat', party: 'party hat', chef: 'chef hat', grad: 'graduation cap', cowboy: 'cowboy hat', headphones: 'headphones', halo: 'halo', bow: 'bow', wizard: 'wizard hat', hood: 'hood' },
  glasses: { round: 'round', square: 'square', sun: 'sunglasses', monocle: 'monocle', vr: 'VR headset' },
  neck:    { tie: 'tie', bowtie: 'bow tie', scarf: 'scarf', medal: 'medal', badge: 'badge' },
  back:    { backpack: 'backpack', cape: 'cape', wings: 'wings', jetpack: 'jetpack' },
  hair:    { short: 'short', long: 'long', bun: 'bun', spiky: 'spiky', curly: 'curly' },
  hold:    { phone: 'phone', heart: 'heart', balloon: 'balloon', coffee: 'coffee', flower: 'flower', briefcase: 'briefcase', umbrella: 'umbrella', book: 'book', key: 'key', star: 'star', magnifier: 'magnifier', trophy: 'trophy', pencil: 'pencil', money: 'money', 'sign:…': 'sign', 'flag:…': 'flag' },
  set:     { room: 'room', bedroom: 'bedroom', office: 'office', classroom: 'classroom', cafe: 'cafe', kitchen: 'kitchen', city: 'city', street: 'street', subway: 'subway', forest: 'forest', park: 'park', sea: 'sea', mountains: 'mountains', desert: 'desert', space: 'space', stage: 'stage', garage: 'garage (cartoon)', desk: 'desk close-up', blackout: 'blackout + spotlight' },
  weather: { rain: 'rain', snow: 'snow', leaves: 'falling leaves', wind: 'wind' },
};
