// Utilitaires pour la gestion des couleurs
export const getColorClass = (colorName: string): string => {
  // Normaliser le nom de couleur (minuscules, sans accents, sans espaces)
  const normalizedColor = colorName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/\s+/g, '') // Supprimer les espaces
    .trim();

  // Mapping détaillé des couleurs avec leurs variantes
  const colorMap: { [key: string]: string } = {
    // Blancs
    'blanc': 'bg-white border-2 border-gray-300',
    'white': 'bg-white border-2 border-gray-300',
    'ecru': 'bg-stone-100 border-2 border-stone-300',
    'creme': 'bg-amber-50 border-2 border-amber-200',
    'ivoire': 'bg-yellow-50 border-2 border-yellow-200',
    'cassé': 'bg-stone-50 border-2 border-stone-200',
    
    // Noirs
    'noir': 'bg-black',
    'black': 'bg-black',
    'charbon': 'bg-gray-900',
    'anthracite': 'bg-gray-800',
    'ebene': 'bg-gray-900',
    
    // Gris
    'gris': 'bg-gray-500',
    'gray': 'bg-gray-500',
    'grey': 'bg-gray-500',
    'grisclair': 'bg-gray-300',
    'grisfonce': 'bg-gray-700',
    'argent': 'bg-gray-400',
    'silver': 'bg-gray-400',
    'platine': 'bg-gray-300',
    
    // Rouges
    'rouge': 'bg-red-500',
    'red': 'bg-red-500',
    'bordeaux': 'bg-red-800',
    'burgundy': 'bg-red-800',
    'cerise': 'bg-red-600',
    'cherry': 'bg-red-600',
    'carmin': 'bg-red-700',
    'vermillon': 'bg-red-600',
    'ecarlate': 'bg-red-600',
    'pourpre': 'bg-red-700',
    'grenat': 'bg-red-900',
    'framboise': 'bg-pink-600',
    'corail': 'bg-red-400',
    'coral': 'bg-red-400',
    
    // Roses
    'rose': 'bg-pink-400',
    'pink': 'bg-pink-400',
    'rosepale': 'bg-pink-200',
    'rosevif': 'bg-pink-500',
    'fuchsia': 'bg-fuchsia-500',
    'magenta': 'bg-fuchsia-600',
    'saumon': 'bg-pink-300',
    'salmon': 'bg-pink-300',
    'rosefleurie': 'bg-gradient-to-br from-pink-300 to-pink-500',
    
    // Oranges
    'orange': 'bg-orange-500',
    'orangevif': 'bg-orange-600',
    'orangepale': 'bg-orange-300',
    'abricot': 'bg-orange-300',
    'peche': 'bg-orange-200',
    'peach': 'bg-orange-200',
    'mandarine': 'bg-orange-500',
    'citrouille': 'bg-orange-600',
    
    // Jaunes
    'jaune': 'bg-yellow-400',
    'yellow': 'bg-yellow-400',
    'jaunevif': 'bg-yellow-500',
    'jaunepale': 'bg-yellow-200',
    'citron': 'bg-yellow-300',
    'lemon': 'bg-yellow-300',
    'or': 'bg-yellow-500',
    'gold': 'bg-yellow-500',
    'dore': 'bg-yellow-600',
    'miel': 'bg-amber-400',
    'honey': 'bg-amber-400',
    'moutarde': 'bg-yellow-600',
    'mustard': 'bg-yellow-600',
    'jaunefleurie': 'bg-gradient-to-br from-yellow-300 to-yellow-500',
    
    // Verts
    'vert': 'bg-green-500',
    'green': 'bg-green-500',
    'vertsapin': 'bg-green-800',
    'vertfonce': 'bg-green-700',
    'vertclair': 'bg-green-300',
    'vertpale': 'bg-green-200',
    'emeraude': 'bg-emerald-500',
    'emerald': 'bg-emerald-500',
    'jade': 'bg-green-600',
    'olive': 'bg-green-700',
    'kaki': 'bg-green-600',
    'khaki': 'bg-green-600',
    'menthe': 'bg-green-300',
    'mint': 'bg-green-300',
    'lime': 'bg-lime-400',
    'citronvert': 'bg-lime-500',
    'anis': 'bg-lime-400',
    'foret': 'bg-green-800',
    'forest': 'bg-green-800',
    'sauge': 'bg-green-400',
    'sage': 'bg-green-400',
    
    // Bleus
    'bleu': 'bg-blue-500',
    'blue': 'bg-blue-500',
    'bleumarine': 'bg-blue-900',
    'navy': 'bg-blue-900',
    'marine': 'bg-blue-900',
    'bleudelave': 'bg-blue-400',
    'bleuclair': 'bg-blue-300',
    'bleupale': 'bg-blue-200',
    'bleufonce': 'bg-blue-700',
    'bleucanard': 'bg-teal-600',
    'teal': 'bg-teal-500',
    'turquoise': 'bg-cyan-400',
    'cyan': 'bg-cyan-400',
    'azur': 'bg-sky-400',
    'azure': 'bg-sky-400',
    'ciel': 'bg-sky-300',
    'sky': 'bg-sky-300',
    'bleuciel': 'bg-sky-300',
    'cobalt': 'bg-blue-600',
    'indigo': 'bg-indigo-600',
    'saphir': 'bg-blue-700',
    'sapphire': 'bg-blue-700',
    'bleuelectrique': 'bg-blue-600',
    'bleufleurie': 'bg-gradient-to-br from-blue-400 to-blue-600',
    'petrole': 'bg-teal-700',
    'canard': 'bg-teal-600',
    
    // Violets/Pourpres
    'violet': 'bg-violet-500',
    'purple': 'bg-purple-500',
    'violetclair': 'bg-violet-300',
    'violetfonce': 'bg-violet-700',
    'lavande': 'bg-purple-300',
    'lavender': 'bg-purple-300',
    'lilas': 'bg-purple-400',
    'lilac': 'bg-purple-400',
    'mauve': 'bg-purple-400',
    'prune': 'bg-purple-800',
    'plum': 'bg-purple-800',
    'aubergine': 'bg-purple-900',
    'eggplant': 'bg-purple-900',
    
    // Marrons/Beiges
    'marron': 'bg-amber-800',
    'brown': 'bg-amber-800',
    'brun': 'bg-amber-900',
    'chocolat': 'bg-amber-900',
    'chocolate': 'bg-amber-900',
    'cafe': 'bg-amber-800',
    'coffee': 'bg-amber-800',
    'caramel': 'bg-amber-600',
    'beige': 'bg-amber-100',
    'sable': 'bg-yellow-100',
    'sand': 'bg-yellow-100',
    'taupe': 'bg-stone-400',
    'noisette': 'bg-amber-700',
    'hazelnut': 'bg-amber-700',
    'cognac': 'bg-amber-700',
    'cuir': 'bg-amber-800',
    'leather': 'bg-amber-800',
    'terre': 'bg-amber-700',
    'earth': 'bg-amber-700',
    'camel': 'bg-amber-600',
    'chameau': 'bg-amber-600',
    
    // Couleurs métalliques
    'bronze': 'bg-amber-700',
    'cuivre': 'bg-orange-700',
    'copper': 'bg-orange-700',
    'laiton': 'bg-yellow-700',
    'brass': 'bg-yellow-700',
    
    // Couleurs spéciales
    'transparent': 'bg-transparent border-2 border-gray-300',
    'multicolore': 'bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400',
    'rainbow': 'bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400',
    'arcenciel': 'bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400',
    'holographique': 'bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400',
    'irise': 'bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400',
  };

  // Recherche exacte d'abord
  if (colorMap[normalizedColor]) {
    return colorMap[normalizedColor];
  }

  // Recherche par mots-clés contenus dans le nom
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalizedColor.includes(key) || key.includes(normalizedColor)) {
      return value;
    }
  }

  // Recherche par famille de couleur (si le nom contient certains mots-clés)
  const colorFamilies = [
    { keywords: ['rouge', 'red', 'cerise', 'cherry', 'bordeaux'], color: 'bg-red-500' },
    { keywords: ['rose', 'pink', 'fuchsia'], color: 'bg-pink-400' },
    { keywords: ['orange', 'abricot', 'peche'], color: 'bg-orange-500' },
    { keywords: ['jaune', 'yellow', 'citron', 'or'], color: 'bg-yellow-400' },
    { keywords: ['vert', 'green', 'emeraude', 'olive'], color: 'bg-green-500' },
    { keywords: ['bleu', 'blue', 'marine', 'turquoise', 'cyan'], color: 'bg-blue-500' },
    { keywords: ['violet', 'purple', 'mauve', 'lavande'], color: 'bg-violet-500' },
    { keywords: ['marron', 'brown', 'chocolat', 'cafe'], color: 'bg-amber-800' },
    { keywords: ['beige', 'sable', 'taupe'], color: 'bg-amber-100' },
    { keywords: ['gris', 'gray', 'grey', 'argent'], color: 'bg-gray-500' },
    { keywords: ['noir', 'black', 'charbon'], color: 'bg-black' },
    { keywords: ['blanc', 'white', 'creme', 'ivoire'], color: 'bg-white border-2 border-gray-300' },
  ];

  for (const family of colorFamilies) {
    if (family.keywords.some(keyword => normalizedColor.includes(keyword))) {
      return family.color;
    }
  }

  // Couleur par défaut si aucune correspondance
  return 'bg-gray-400';
};

// Fonction pour obtenir une couleur de texte contrastée
export const getContrastTextColor = (colorClass: string): string => {
  const darkBackgrounds = [
    'bg-black', 'bg-gray-800', 'bg-gray-900', 'bg-red-800', 'bg-red-900',
    'bg-blue-800', 'bg-blue-900', 'bg-green-800', 'bg-green-900',
    'bg-purple-800', 'bg-purple-900', 'bg-amber-800', 'bg-amber-900'
  ];

  return darkBackgrounds.some(dark => colorClass.includes(dark)) ? 'text-white' : 'text-gray-800';
};

// Fonction pour détecter si une couleur nécessite une bordure
export const needsBorder = (colorClass: string): boolean => {
  const lightColors = [
    'bg-white', 'bg-yellow-50', 'bg-yellow-100', 'bg-yellow-200',
    'bg-amber-50', 'bg-amber-100', 'bg-stone-50', 'bg-stone-100',
    'bg-gray-50', 'bg-gray-100', 'bg-pink-50', 'bg-pink-100'
  ];

  return lightColors.some(light => colorClass.includes(light)) || colorClass.includes('bg-white');
};