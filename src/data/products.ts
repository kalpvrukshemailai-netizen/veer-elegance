export type Category = 'Inside' | 'Necklace' | 'Chain' | 'Earring' | 'By Owner';

export interface Product {
  id: string;
  category: Category;
  title: string;
  image: string;
  price: number;
}

export const products: Product[] = [
  { id: '1', category: 'Necklace', title: 'Kundan Choker Set', image: '/assets/images/kundan_necklace_1786365599450.png', price: 15900 },
  { id: '2', category: 'Necklace', title: 'Emerald Layered Necklace', image: '/assets/images/teal_necklace_1786365640333.png', price: 22500 },
  { id: '3', category: 'Necklace', title: 'Bridal Heavy Set', image: '/assets/images/pearl_choker_1786365612240.png', price: 34000 },
  { id: '4', category: 'Necklace', title: 'Antique Gold Finish Necklace', image: '/assets/images/kundan_necklace_1786365599450.png', price: 18200 },
  { id: '5', category: 'Chain', title: 'Delicate Gold Chain', image: '/assets/images/teal_necklace_1786365640333.png', price: 4500 },
  { id: '6', category: 'Chain', title: 'Layered Minimalist Chain', image: '/assets/images/pearl_choker_1786365612240.png', price: 6800 },
  { id: '7', category: 'Earring', title: 'Maroon Jhumkas', image: '/assets/images/gold_jhumkas_1786365624809.png', price: 3200 },
  { id: '8', category: 'Earring', title: 'Kundan Drop Earrings', image: '/assets/images/gold_jhumkas_1786365624809.png', price: 4100 },
  { id: '9', category: 'Earring', title: 'Classic Chandbali', image: '/assets/images/gold_jhumkas_1786365624809.png', price: 5500 },
  { id: '10', category: 'Inside', title: 'Boutique Interior', image: '/assets/images/pearl_choker_1786365612240.png', price: 0 },
  { id: '11', category: 'Inside', title: 'Display Counter', image: '/assets/images/kundan_necklace_1786365599450.png', price: 0 },
  { id: '12', category: 'By Owner', title: 'Owner\'s Pick', image: '/assets/images/teal_necklace_1786365640333.png', price: 28500 },
];

export const fallbackImage = '/assets/images/kundan_necklace_1786365599450.png';

export const getImageUrl = (path: string) => {
  return path;
};
