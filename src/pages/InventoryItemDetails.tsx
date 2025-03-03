import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Loader2, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Clock, 
  Package 
} from 'lucide-react';
import { 
  getInventoryItem, 
  deleteInventoryItem, 
  getItemTransactions,
  createInventoryTransaction
} from '../services/inventoryService';
import type { InventoryItem, InventoryTransaction } from '../types/inventory';
import InventoryItemForm from '../components/InventoryItemForm';
import { useAuthStore } from '../store/authStore';

export default function InventoryItemDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [transactionQuantity, setTransactionQuantity] = useState(1);
  const [transactionReason, setTransactionReason] = useState('');
  const [transactionNotes, setTransactionNotes] = useState('');
  const [transactionError, setTransactionError] = useState('');

  useEffect(() => {
    if (id) {
      loadItemData(id);
    }
  }, [id]);

  const loadItemData = async (itemId: string) => {
    try {
      setIsLoading(true);
      const [itemData, transactionsData] = await Promise.all([
        getInventoryItem(itemId),
        getItemTransactions(itemId)
      ]);
      setItem(itemData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading item data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Tem certeza que deseja excluir este item?')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteInventoryItem(id);
      navigate('/inventory');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Erro ao excluir item. Por favor, tente novamente.');
      setIsDeleting(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransactionError('');

    if (transactionQuantity <= 0) {
      setTransactionError('A quantidade deve ser maior que zero');
      return;
    }

    if (!transactionReason.trim()) {
      setTransactionError('O motivo é obrigatório');
      return;
    }

    if (!id || !user) return;

    try {
      setIsLoading(true);
      
      await createInventoryTransaction({
        item_id: id,
        type: transactionType,
        quantity: transactionQuantity,
        reason: transactionReason,
        notes: transactionNotes,
        created_by: user.id
      });
      
      // Reload data
      await loadItemData(id);
      
      // Reset form
      setTransactionQuantity(1);
      setTransactionReason('');
      setTransactionNotes('');
      setShowAddTransactionForm(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Erro ao registrar transação. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading && !item) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="ml-2 text-gray-600 dark:text-gray-300">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/inventory')}
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {item?.name || 'Detalhes do Item'}
            </h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowEditForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </button>
          </div>
        </div>

        {item && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Item Details */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Informações do Item
                  </h3>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <dl>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Nome</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.name}</dd>
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">SKU</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.sku}</dd>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Categoria</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.category}</dd>
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Descrição</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                        {item.description || 'Sem descrição'}
                      </dd>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Quantidade em Estoque</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.quantity <= 0
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : item.quantity < item.min_quantity
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {item.quantity} {item.quantity <= 0
                            ? '(Sem estoque)'
                            : item.quantity < item.min_quantity
                            ? '(Estoque baixo)'
                            : '(Disponível)'}
                        </span>
                      </dd>
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Quantidade Mínima</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.min_quantity}</dd>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Preço de Custo</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{formatCurrency(item.cost_price)}</dd>
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Preço de Venda</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{formatCurrency(item.sale_price)}</dd>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Fornecedor</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.supplier || 'Não especificado'}</dd>
                    </div>
                    
                    {/* Novos campos específicos para produtos de provedores */}
                    {item.item_type && (
                      <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Tipo de Item</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.item_type}</dd>
                      </div>
                    )}
                    
                    {item.brand && (
                      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Marca</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.brand}</dd>
                      </div>
                    )}
                    
                    {item.model && (
                      <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Modelo</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.model}</dd>
                      </div>
                    )}
                    
                    {item.mac_address && (
                      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Endereço MAC</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.mac_address}</dd>
                      </div>
                    )}
                    
                    {item.serial_number && (
                      <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Número de Série</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.serial_number}</dd>
                      </div>
                    )}
                    
                    {item.cable_length && (
                      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Comprimento do Cabo</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.cable_length} metros</dd>
                      </div>
                    )}
                    
                    {item.cable_type && (
                      <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Tipo de Cabo</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.cable_type}</dd>
                      </div>
                    )}
                    
                    {item.connector_type && (
                      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Tipo de Conector</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.connector_type}</dd>
                      </div>
                    )}
                    
                    <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Localização</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{item.location || 'Não especificado'}</dd>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Última Compra</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{formatDate(item.last_purchase_date)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Inventory Transactions */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Movimentações
                  </h3>
                  <button
                    onClick={() => setShowAddTransactionForm(true)}
                    className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </button>
                </div>
                
                {showAddTransactionForm && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <form onSubmit={handleAddTransaction}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tipo de Movimentação
                          </label>
                          <div className="flex space-x-4">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="transactionType"
                                value="in"
                                checked={transactionType === 'in'}
                                onChange={() => setTransactionType('in')}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Entrada</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="transactionType"
                                value="out"
                                checked={transactionType === 'out'}
                                onChange={() => setTransactionType('out')}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Saída</span>
                            </label>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={transactionQuantity}
                            onChange={(e) => setTransactionQuantity(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Motivo
                          </label>
                          <input
                            type="text"
                            value={transactionReason}
                            onChange={(e) => setTransactionReason(e.target.value)}
                            placeholder={transactionType === 'in' ? 'Ex: Compra, Devolução' : 'Ex: Venda, Uso interno'}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Observações (opcional)
                          </label>
                          <textarea
                            value={transactionNotes}
                            onChange={(e) => setTransactionNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        {transactionError && (
                          <div className="text-sm text-red-600 dark:text-red-400 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {transactionError}
                          </div>
                        )}
                        
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowAddTransactionForm(false)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              'Registrar'
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
                
                <div className="overflow-y-auto max-h-[500px]">
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Clock className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Nenhuma movimentação registrada
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {transactions.map((transaction) => (
                        <li key={transaction.id} className="px-4 py-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center">
                                {transaction.type === 'in' ? (
                                  <Plus className="h-4 w-4 text-green-500 mr-1" />
                                ) : (
                                  <Minus className="h-4 w-4 text-red-500 mr-1" />
                                )}
                                <span className={`text-sm font-medium ${
                                  transaction.type === 'in' 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {transaction.type === 'in' ? 'Entrada' : 'Saída'} de {transaction.quantity} {transaction.quantity > 1 ? 'unidades' : 'unidade'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {transaction.reason}
                              </p>
                              {transaction.notes && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {transaction.notes}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(transaction.created_at)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {showEditForm && item && (
        <InventoryItemForm 
          item={item}
          onClose={() => setShowEditForm(false)} 
          onSave={() => {
            setShowEditForm(false);
            if (id) loadItemData(id);
          }}
        />
      )}
    </div>
  );
} 