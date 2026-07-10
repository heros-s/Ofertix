'use client';

import { useActionState, useState } from 'react';
import { Upload, X, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormProps {
  categories: Category[];
  initialData?: {
    id: string;
    name: string;
    description: string;
    category_id: string;
    price: number;
    stock: number;
    images: string[];
    active: boolean;
  };
  action: (prevState: any, formData: FormData) => Promise<any>;
}

export default function ProductForm({ categories, initialData, action }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filtra letras nos campos numéricos
  const preventNonNumerical = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
  };

  // Filtra letras no campo de preço, aceitando apenas dígitos, ponto e vírgula
  const handlePriceInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^\d.,]/g, '');
  };

  // Envia a imagem para o Cloudinary (ou gera mock se não configurado)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

    // Verifica se as credenciais do Cloudinary foram devidamente preenchidas no .env
    const isCloudinaryConfigured =
      cloudName &&
      cloudName !== 'your-cloudinary-cloud-name' &&
      uploadPreset &&
      uploadPreset !== 'your-unsigned-upload-preset';

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!isCloudinaryConfigured) {
          // MODO SIMULAÇÃO: gera imagens mock elegantes e realistas
          await new Promise((resolve) => setTimeout(resolve, 800)); // Simula delay de rede
          const mockImages = [
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
          ];
          const randomUrl = mockImages[Math.floor(Math.random() * mockImages.length)] + `&sig=${Math.floor(Math.random() * 1000)}`;
          uploadedUrls.push(randomUrl);
        } else {
          // UPLOAD REAL CLOUDINARY
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', uploadPreset);

          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Falha no upload para o Cloudinary.');
          }

          const responseData = await response.json();
          uploadedUrls.push(responseData.secure_url);
        }
      }

      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setUploadError(err.message || 'Erro inesperado ao enviar imagens.');
    } finally {
      setUploading(false);
      // Limpa o input de arquivo
      e.target.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  return (
    <form action={formAction} className="space-y-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm">
      {state?.error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl text-center font-medium flex items-center justify-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {state.error}
        </div>
      )}

      {/* Renderiza inputs ocultos para as imagens para que a Server Action capture no formData */}
      {images.map((url, idx) => (
        <input key={idx} type="hidden" name="images" value={url} />
      ))}

      {/* Se for edição, expõe o status ativo */}
      {initialData && (
        <input type="hidden" name="active" value={initialData.active ? 'true' : 'false'} />
      )}

      {/* Informações Básicas */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">
          Informações do Produto
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
              Nome do Produto
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              disabled={isPending}
              defaultValue={initialData?.name}
              placeholder="Ex: Smartwatch Premium X1"
              className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50 text-sm transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="categoryId" className="block text-sm font-semibold text-slate-700">
              Categoria
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              disabled={isPending}
              defaultValue={initialData?.category_id}
              className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50 text-sm transition-all duration-200"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-slate-700">
            Descrição do Produto
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            disabled={isPending}
            defaultValue={initialData?.description}
            placeholder="Descreva detalhadamente o produto, suas características, especificações técnicas..."
            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50 text-sm transition-all duration-200 resize-y"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="price" className="block text-sm font-semibold text-slate-700">
              Preço de Venda (R$)
            </label>
            <input
              id="price"
              name="price"
              type="text"
              required
              disabled={isPending}
              onInput={handlePriceInput}
              defaultValue={initialData?.price}
              placeholder="Ex: 299.90"
              className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50 text-sm transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-semibold text-slate-700">
              Quantidade em Estoque
            </label>
            <input
              id="stock"
              name="stock"
              type="text"
              required
              disabled={isPending}
              onInput={preventNonNumerical}
              defaultValue={initialData?.stock}
              placeholder="Ex: 15"
              className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50 text-sm transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Galeria de Fotos */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Galeria de Fotos
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            (Pelo menos 1 foto recomendada)
          </span>
        </div>

        {uploadError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-lg flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" /> {uploadError}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Miniaturas de Imagens Cadastradas */}
          {images.map((url, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden group">
              <img
                src={url}
                alt={`Imagem do produto ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                disabled={isPending || uploading}
                className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 shadow"
                title="Remover foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Botão de Upload */}
          <label className={`relative aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            uploading || isPending
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-500 hover:text-indigo-650'
          }`}>
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={uploading || isPending}
              onChange={handleImageUpload}
              className="sr-only"
            />
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mb-1" />
                <span className="text-[11px] font-semibold text-slate-500">Enviando...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 mb-1" />
                <span className="text-xs font-semibold">Adicionar Foto</span>
              </>
            )}
          </label>
        </div>

        {images.length === 0 && !uploading && (
          <p className="text-[11px] text-slate-400 mt-2">
            Nenhuma imagem adicionada. Caso você não possua chaves do Cloudinary configuradas, geraremos imagens fictícias automáticas para você testar!
          </p>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="border-t border-slate-200 pt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={isPending || uploading}
          className="px-5 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all duration-200"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isPending || uploading}
          className="inline-flex justify-center items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              {initialData ? 'Salvar Alterações' : 'Publicar Produto'} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
