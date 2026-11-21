// Alternate models and family roles shared by the world and the gallery.
const base = (label, options = {}) => ({ label, ...options });
const galleryVariant = (label, note, options = {}) => ({ label, note, galleryOnly: true, ...options });
const parent = (note, options = {}) => base('Adult female', { note, role: 'parent', ...options });
const young = (note, options = {}) => base('Juvenile', { note, role: 'young', ...options });

const ANIMAL_VARIANTS = {
  'Green anaconda': [
    base('Adult', { note: 'Approximately 4.7 m long' }),
    base('Large adult', { scale: 1.3, note: 'Rare large individual, approximately 6.1 m long' }),
  ],
  Geese: [
    base('Adult', { role: 'parent' }),
    young('Young goose in the flock', { scale: 0.8, shape: { c: 0x887c69, c2: 0x4b4037 } }),
  ],
  Penguin: [
    base('Adult', { role: 'parent' }),
    young('Downy gray chick', { scale: 0.52, shape: { c: 0x797c83, belly: 0xc5c5c3, beakC: 0x534b45, legC: 0x534b45 } }),
  ],
  'Red deer': [
    base('Adult male', { note: 'Antlered stag' }),
    parent('Smaller hind without antlers', { shape: { antlers: 0 }, scale: 0.83 }),
    young('Smaller fawn with pale spots', { shape: { antlers: 0, head: [0.32, 0.33, 0.5], spots: 0xe4d2b1 }, scale: 0.53 }),
  ],
  'White-tailed deer': [
    base('Adult male', { note: 'Antlered buck' }),
    parent('Doe without antlers', { shape: { antlers: 0 }, scale: 0.87 }),
    young('Smaller fawn with pale spots', { shape: { antlers: 0, head: [0.29, 0.32, 0.46], spots: 0xf0e3c9 }, scale: 0.5 }),
  ],
  Moose: [
    base('Adult male', { note: 'Antlered bull' }),
    parent('Cow without antlers', { shape: { antlers: 0 }, scale: 0.86 }),
    young('Smaller calf proportions', { shape: { antlers: 0, c: 0x77543d }, scale: 0.49 }),
  ],
  Lion: [
    base('Adult male', { note: 'Dark mane' }),
    parent('Lioness without a mane', { shape: { mane: 0 }, scale: 0.84 }),
    young('Smaller cub with a proportionally larger head', { shape: { mane: 0, head: [0.49, 0.44, 0.46] }, scale: 0.48 }),
  ],
  Ostrich: [
    base('Adult male', { note: 'Black body with white tail feathers' }),
    parent('Gray-brown plumage', { shape: { c: 0x8b7f6d, tailC: 0xc5b9a4 }, scale: 0.9 }),
    young('Smaller bird with mottled brown tones', { shape: { c: 0xa99472, tailC: 0xb2a086, stripes: 0x82715b }, scale: 0.55 }),
  ],
  Kestrel: [
    base('Base model'),
    galleryVariant('Adult male', 'Slate-gray head and tail', { shape: { c2: 0x82919e, tailC: 0x718291 } }),
    galleryVariant('Adult female', 'Browner head, wings, and tail', { shape: { c2: 0xa07c59, tailC: 0x8e684b, wingC: 0x815631 } }),
    galleryVariant('Juvenile', 'Warm brown young bird', { shape: { c2: 0x9b6d4c, tailC: 0x805738, wingC: 0x8e623e } }),
  ],
  'Black howler monkey': [
    base('Adult male', { note: 'Near-black coat and tail' }),
    parent('Golden-brown coat', { shape: { height: 0.53, fur: 0xaa8650, chest: 0xc0a06b, face: 0x584b44 } }),
    young('Smaller model with a golden-brown coat', { shape: { height: 0.32, tail: 0.42, fur: 0xc7a873, chest: 0xd3b98c, face: 0x6b5244 } }),
  ],
  Walrus: [
    base('Adult', { note: 'Large tusks' }),
    galleryVariant('Adult male', 'Larger build with heavier tusks', { scale: 1.1, shape: { tusks: 0.7 } }),
    parent('Smaller build with shorter tusks', { scale: 0.81, shape: { tusks: 0.46 } }),
    young('Dark-coated calf with short tusks', { scale: 0.52, shape: { c: 0x493e38, c2: 0x64514a, tusks: 0.13 } }),
  ],
};

function describeAnimalVariants(sp) {
  if (sp.shape?.kind === 'gorilla') return [
    base('Adult male · Silverback', { leader: true, scale: 1.16, note: 'Silver saddle and larger build' }),
    base('Adult · Troop member', { note: 'Dark coat' }),
    parent('Smaller dark-coated model', { scale: 0.82 }),
    young('Smaller young model', { scale: 0.52 }),
  ];
  if (sp.kind === 'orangutan') return [
    base('Adult male', { note: 'Model with broad cheek pads' }),
    parent('Smaller build with narrower cheeks', { shape: { height: sp.height * 0.8, cheekScale: 0.27 } }),
    young('Smaller model with narrow cheeks', { shape: { height: sp.height * 0.58, cheekScale: 0.18 } }),
  ];
  if (ANIMAL_VARIANTS[sp.name]) return ANIMAL_VARIANTS[sp.name];
  if (sp.school && sp.group === 'Mammals') {
    return [parent('Adult with a calf or pup'), young('Smaller calf or pup', { scale: sp.swim.L > 8 ? 0.4 : 0.59 })];
  }
  if (sp.tail && sp.fur) {
    return [parent('Adult on a branch with young'), young('Smaller young model', {
      shape: { height: sp.height * 0.61, tail: sp.tail * 0.68 },
    })];
  }
  if (sp.herd && (sp.group === 'Mammals' || sp.group === 'Birds')) {
    return [
      base('Adult', { role: 'parent' }),
      young('Smaller young model', { scale: 0.55, shape: { horns: 0, antlers: 0, mane: 0, tusks: false } }),
    ];
  }
  return [base('Base model')];
}

const catalogue = new WeakMap();
export function animalVariants(sp) {
  if (!catalogue.has(sp)) catalogue.set(sp, describeAnimalVariants(sp));
  return catalogue.get(sp);
}

export function familyVariants(sp) {
  const variants = animalVariants(sp);
  const parent = variants.find((variant) => variant.role === 'parent');
  const young = variants.find((variant) => variant.role === 'young');
  return parent && young ? { parent, young } : null;
}
