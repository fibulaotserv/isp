import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Plus } from 'lucide-react';
import { 
  createInventoryItem, 
  updateInventoryItem, 
  getInventoryCategories,
  getInventorySuppliers,
  createInventoryCategory,
  ensureDefaultCategory,
  ensureDefaultSupplier
} from '../services/inventoryService';
import type { 
  InventoryItem, 
  InventoryItemFormData, 
  InventoryCategory,
  InventorySupplier
} from '../types/inventory';

interface InventoryItemFormProps {
  item?: InventoryItem;
  onClose: () => void;
  onSave: () => void;
}

export default function InventoryItemForm({ item, onClose, onSave }: InventoryItemFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [formData, setFormData] = useState<InventoryItemFormData>({
    name: item?.name || '',
    description: item?.description || '',
    sku: item?.sku || '',
    category: item?.category || '',
    quantity: item?.quantity || 0,
    min_quantity: item?.min_quantity || 5,
    cost_price: item?.cost_price || 0,
    sale_price: item?.sale_price || 0,
    supplier: item?.supplier || '',
    location: item?.location || '',
    last_purchase_date: item?.last_purchase_date || null,
    
    // Campos específicos para provedores de internet
    item_type: item?.item_type || 'other',
    brand: item?.brand || '',
    model: item?.model || '',
    mac_address: item?.mac_address || '',
    serial_number: item?.serial_number || '',
    cable_length: item?.cable_length || 0,
    cable_type: item?.cable_type || '',
    connector_type: item?.connector_type || 'UPC'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoGenerateSku, setAutoGenerateSku] = useState(!item);

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    // Gerar SKU automaticamente quando o nome ou tipo de item mudar
    if (autoGenerateSku && formData.name) {
      const timestamp = new Date().getTime().toString().slice(-6);
      const namePrefix = formData.name.slice(0, 3).toUpperCase();
      const typePrefix = formData.item_type ? formData.item_type.slice(0, 2).toUpperCase() : 'OT';
      const newSku = `${typePrefix}${namePrefix}${timestamp}`;
      
      setFormData({
        ...formData,
        sku: newSku
      });
    }
  }, [formData.name, formData.item_type, autoGenerateSku]);

  const loadFormData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar categorias e fornecedores
      const [categoriesData, suppliersData] = await Promise.all([
        getInventoryCategories(),
        getInventorySuppliers()
      ]);
      
      setCategories(categoriesData);
      setSuppliers(suppliersData);
      
      // Se não houver categorias ou fornecedores, criar os padrões
      if (categoriesData.length === 0 || suppliersData.length === 0) {
        const [defaultCategory, defaultSupplier] = await Promise.all([
          ensureDefaultCategory(),
          ensureDefaultSupplier()
        ]);
        
        if (categoriesData.length === 0) {
          setCategories([defaultCategory]);
          if (!item) {
            setFormData(prev => ({
              ...prev,
              category: defaultCategory.name
            }));
          }
        }
        
        if (suppliersData.length === 0) {
          setSuppliers([defaultSupplier]);
          if (!item) {
            setFormData(prev => ({
              ...prev,
              supplier: defaultSupplier.name
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      const newCategory = await createInventoryCategory({
        name: newCategoryName,
        description: newCategoryDescription
      });
      
      setCategories([...categories, newCategory]);
      setFormData({
        ...formData,
        category: newCategory.name
      });
      
      setShowNewCategoryForm(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Erro ao criar categoria. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!autoGenerateSku && !formData.sku.trim()) {
      newErrors.sku = 'SKU é obrigatório';
    }
    
    if (!formData.category) {
      newErrors.category = 'Categoria é obrigatória';
    }
    
    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantidade não pode ser negativa';
    }
    
    if (formData.min_quantity < 0) {
      newErrors.min_quantity = 'Quantidade mínima não pode ser negativa';
    }
    
    if (formData.cost_price < 0) {
      newErrors.cost_price = 'Preço de custo não pode ser negativo';
    }
    
    if (formData.sale_price < 0) {
      newErrors.sale_price = 'Preço de venda não pode ser negativo';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Garantir que o SKU seja gerado se a opção estiver ativada
    if (autoGenerateSku && !formData.sku) {
      const timestamp = new Date().getTime().toString().slice(-6);
      const namePrefix = formData.name.slice(0, 3).toUpperCase();
      const typePrefix = formData.item_type ? formData.item_type.slice(0, 2).toUpperCase() : 'OT';
      const newSku = `${typePrefix}${namePrefix}${timestamp}`;
      
      setFormData({
        ...formData,
        sku: newSku
      });
    }
    
    // Verificar se há uma categoria selecionada
    if (!formData.category) {
      try {
        const defaultCategory = await ensureDefaultCategory();
        setFormData({
          ...formData,
          category: defaultCategory.name
        });
      } catch (error) {
        console.error('Error creating default category:', error);
      }
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      if (item) {
        await updateInventoryItem(item.id, formData);
      } else {
        await createInventoryItem(formData);
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('Erro ao salvar item. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {item ? 'Editar Item' : 'Adicionar Novo Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading && !item ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <span className="ml-2 text-gray-600 dark:text-gray-300">Carregando...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SKU
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      disabled={autoGenerateSku}
                      className={`w-full px-3 py-2 border ${
                        errors.sku ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
                        autoGenerateSku ? 'bg-gray-100 dark:bg-gray-600' : ''
                      }`}
                    />
                  </div>
                  <div className="mt-1 flex items-center">
                    <input
                      type="checkbox"
                      id="autoGenerateSku"
                      checked={autoGenerateSku}
                      onChange={() => setAutoGenerateSku(!autoGenerateSku)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoGenerateSku" className="ml-2 block text-sm text-gray-600 dark:text-gray-400">
                      Gerar SKU automaticamente
                    </label>
                  </div>
                  {errors.sku && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sku}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoria
                  </label>
                  {!showNewCategoryForm ? (
                    <div className="flex items-center">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${
                          errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
                      >
                        <option value="">Selecione uma categoria</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewCategoryForm(true)}
                        className="ml-2 inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Nome da categoria"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Descrição (opcional)"
                        value={newCategoryDescription}
                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          disabled={!newCategoryName.trim() || isLoading}
                          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Adicionar'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryForm(false)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                  )}
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-3 py-2 border ${
                      errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantidade Mínima
                  </label>
                  <input
                    type="number"
                    name="min_quantity"
                    value={formData.min_quantity}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-3 py-2 border ${
                      errors.min_quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
                  />
                  {errors.min_quantity && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.min_quantity}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border ${
                      errors.cost_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
                  />
                  {errors.cost_price && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cost_price}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="number"
                    name="sale_price"
                    value={formData.sale_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border ${
                      errors.sale_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
                  />
                  {errors.sale_price && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sale_price}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fornecedor
                  </label>
                  <select
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Selecione um fornecedor</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Localização no Estoque
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data da Última Compra
                  </label>
                  <input
                    type="date"
                    name="last_purchase_date"
                    value={formData.last_purchase_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                {/* Tipo de Item */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Item
                  </label>
                  <select
                    name="item_type"
                    value={formData.item_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="other">Outro</option>
                    <option value="onu">ONU</option>
                    <option value="router">Roteador</option>
                    <option value="cable">Cabo</option>
                    <option value="connector">Conector</option>
                  </select>
                </div>
                
                {/* Campos específicos baseados no tipo de item */}
                {(formData.item_type === 'onu' || formData.item_type === 'router') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Modelo
                      </label>
                      <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Endereço MAC
                      </label>
                      <input
                        type="text"
                        name="mac_address"
                        value={formData.mac_address}
                        onChange={handleChange}
                        placeholder="00:11:22:33:44:55"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número de Série
                      </label>
                      <input
                        type="text"
                        name="serial_number"
                        value={formData.serial_number}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                )}
                
                {formData.item_type === 'cable' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de Cabo
                      </label>
                      <input
                        type="text"
                        name="cable_type"
                        value={formData.cable_type}
                        onChange={handleChange}
                        placeholder="Drop, Fibra, UTP..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Metragem
                      </label>
                      <input
                        type="number"
                        name="cable_length"
                        value={formData.cable_length}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                )}
                
                {formData.item_type === 'connector' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo de Conector
                    </label>
                    <select
                      name="connector_type"
                      value={formData.connector_type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="UPC">UPC</option>
                      <option value="APC">APC</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="mr-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 