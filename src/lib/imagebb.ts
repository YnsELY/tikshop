const IMAGEBB_API_KEY = '6adc05d703cb5647f72cd5d8c38a5051';
const IMAGEBB_API_URL = 'https://api.imgbb.com/1/upload';

export const uploadImageToImageBB = async (file: File): Promise<string> => {
  try {
    // Créer un FormData pour l'upload
    const formData = new FormData();
    formData.append('key', IMAGEBB_API_KEY);
    formData.append('image', file);

    // Faire la requête à l'API ImageBB
    const response = await fetch(IMAGEBB_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed');
    }

    // Retourner l'URL de l'image uploadée
    return data.data.url;
  } catch (error) {
    console.error('Error uploading image to ImageBB:', error);
    throw new Error('Échec de l\'upload de l\'image. Veuillez réessayer.');
  }
};