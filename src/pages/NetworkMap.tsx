import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Network, MapPin, X, Loader2, Search, Edit, Target, Layers } from 'lucide-react';
import type { CTO, CTOGroup } from '../types/network';
import { getCTOs, createCTO, updateCTO, getLastMapLocation, saveMapLocation, findNearestCTO, getCTOGroups, createCTOGroup, deleteCTOGroup } from '../services/networkService';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DEFAULT_POSITION: [number, number] = [-23.550520, -46.633308];

// Map click handler component
function MapClickHandler({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

// Search handler component
function SearchHandler({ searchLocation }: { searchLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (searchLocation) {
      map.setView([searchLocation.lat, searchLocation.lng], 15);
    }
  }, [searchLocation, map]);

  return null;
}

// Criar ícones coloridos para os marcadores
const createColoredIcon = (color: string) => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24">
        <path d="M12 0c-4.4 0-8 3.6-8 8 0 5.4 7 13.4 7.3 13.7.2.2.5.3.7.3s.5-.1.7-.3c.3-.3 7.3-8.3 7.3-13.7 0-4.4-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

export default function NetworkMap() {
  const [ctos, setCTOs] = useState<CTO[]>([]);
  const [ctoGroups, setCTOGroups] = useState<CTOGroup[]>([]);
  const [selectedCTO, setSelectedCTO] = useState<CTO | null>(null);
  const [showPortDetails, setShowPortDetails] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFindingCTO, setIsFindingCTO] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [initialPosition, setInitialPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6' // Cor padrão (azul)
  });
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    total_ports: 16,
    address: 'Endereço não definido', // Valor padrão para address
    group_id: ''
  });

  useEffect(() => {
    loadCTOs();
    loadCTOGroups();
    loadLastLocation();
  }, []);

  const loadCTOGroups = async () => {
    try {
      const groups = await getCTOGroups();
      setCTOGroups(groups);
    } catch (error) {
      console.error('Error loading CTO groups:', error);
    }
  };

  const loadLastLocation = async () => {
    try {
      const lastLocation = await getLastMapLocation();
      if (lastLocation) {
        setInitialPosition([lastLocation.latitude, lastLocation.longitude]);
        if (mapRef) {
          mapRef.setView([lastLocation.latitude, lastLocation.longitude], lastLocation.zoom || 13);
        }
      }
    } catch (error) {
      console.error('Error loading last location:', error);
    }
  };

  const loadCTOs = async () => {
    try {
      setIsLoading(true);
      const data = await getCTOs();
      setCTOs(data);
    } catch (error) {
      console.error('Error loading CTOs:', error);
      alert('Erro ao carregar CTOs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    
    // Save last clicked location
    saveMapLocation({
      latitude: lat,
      longitude: lng,
      zoom: mapRef?.getZoom() || 13
    });
    
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
      address: 'Buscando endereço...'
    }));
    setShowAddModal(true);
    
    // Reverse geocode the clicked location
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(response => response.json())
      .then(data => {
        if (data.display_name) {
          setFormData(prev => ({
            ...prev,
            address: data.display_name
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            address: 'Endereço não encontrado'
          }));
        }
      })
      .catch(error => {
        console.error('Error reverse geocoding:', error);
        setFormData(prev => ({
          ...prev,
          address: 'Erro ao buscar endereço'
        }));
      });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const headers = {
      'User-Agent': 'ISP Manager/1.0'
    };

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` + 
        `format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
        { headers }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon: lng, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        // Move map to location
        if (mapRef) {
          mapRef.setView([latitude, longitude], 18);
          saveMapLocation({
            latitude,
            longitude,
            zoom: 18
          });
        }

        // Update form data
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          address: display_name
        }));

        // Show modal
        setShowAddModal(true);
      } else {
        alert('Endereço não encontrado');
      }
    } catch (error) {
      console.error('Error searching address:', error);
      alert('Erro ao buscar endereço');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFindCTO = async () => {
    if (!mapRef) return;
    
    const center = mapRef.getCenter();
    
    try {
      setIsFindingCTO(true);
      const cto = await findNearestCTO(center.lat, center.lng);
      
      if (cto) {
        mapRef.setView([cto.latitude, cto.longitude], 18);
        setSelectedCTO(cto);
        setShowPortDetails(true);
      } else {
        alert('Nenhuma CTO encontrada próxima a esta localização');
      }
    } catch (error) {
      console.error('Error finding CTO:', error);
      alert('Erro ao buscar CTO próxima');
    } finally {
      setIsFindingCTO(false);
    }
  };

  const getPortStatus = (portNumber: number, usedPorts: number) => {
    return portNumber <= usedPorts ? 'used' : 'free';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name.trim() || !formData.latitude || !formData.longitude) {
        alert('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      setIsSubmitting(true);
      
      const ctoData = {
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        total_ports: formData.total_ports,
        address: formData.address,
        group_id: formData.group_id || undefined // Use undefined quando não houver grupo selecionado
      };

      if (isEditing && selectedCTO) {
        await updateCTO(selectedCTO.id, ctoData);
      } else {
        await createCTO({
          ...ctoData,
          used_ports: 0
        });
      }
      
      setShowAddModal(false);
      setIsEditing(false);
      setSelectedCTO(null);
      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        total_ports: 16,
        address: '',
        group_id: ''
      });
      await loadCTOs();
    } catch (error) {
      console.error('Error creating CTO:', error);
      alert('Erro ao criar CTO');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsEditing(false);
      setSearchLocation(null);
      setShowAddModal(false);
      setIsClosing(false);
      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        total_ports: 16,
        address: '',
        group_id: ''
      });
    }, 200);
  };

  const handleModalClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setSelectedCTO(null);
    setShowPortDetails(false);
    
    // Aguardar a próxima renderização para ajustar o mapa
    setTimeout(() => {
      if (mapRef) {
        mapRef.invalidateSize();
        const center = mapRef.getCenter();
        saveMapLocation({
          latitude: center.lat,
          longitude: center.lng,
          zoom: mapRef.getZoom()
        });
      }
    }, 100);
  };

  const handleEdit = (cto: CTO) => {
    setSelectedCTO(cto);
    setIsEditing(true);
    setFormData({
      name: cto.name,
      latitude: cto.latitude.toString(),
      longitude: cto.longitude.toString(),
      total_ports: cto.total_ports,
      address: cto.address,
      group_id: cto.group_id
    });
    setShowAddModal(true);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      await createCTOGroup({
        name: groupFormData.name,
        description: groupFormData.description,
        color: groupFormData.color
      });
      
      await loadCTOGroups();
      setShowGroupModal(false);
      setGroupFormData({
        name: '',
        description: '',
        color: '#3B82F6'
      });
    } catch (error) {
      console.error('Error creating CTO group:', error);
      alert('Erro ao criar grupo de CTO');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para obter o ícone da CTO
  const getCTOIcon = (cto: CTO) => {
    if (cto.group?.color) {
      return createColoredIcon(cto.group.color);
    }
    return new L.Icon.Default();
  };

  // Função para agrupar CTOs por grupo
  const groupedCTOs = ctos.reduce((acc, cto) => {
    const groupId = cto.group_id || 'sem-grupo';
    if (!acc[groupId]) {
      acc[groupId] = {
        group: cto.group || {
          id: 'sem-grupo',
          name: 'Sem Grupo',
          color: '#808080',
          tenant_id: '', // Adicionando tenant_id requerido
          description: 'CTOs sem grupo'
        },
        ctos: []
      };
    }
    acc[groupId].ctos.push(cto);
    return acc;
  }, {} as Record<string, { group: CTOGroup, ctos: CTO[] }>);

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isFullscreen ? 'p-0 fixed inset-0 z-50' : 'py-8'}`}>
      <div className={`${isFullscreen ? 'h-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        <div className={`mb-6 ${isFullscreen ? 'absolute top-4 left-4 right-4 z-10' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Network className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              <h1 className="ml-2 text-2xl font-semibold text-gray-900 dark:text-white">Rede FTTH</h1>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowGroupModal(true)}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${isFullscreen ? 'hidden' : ''}`}
              >
                <Layers className="h-4 w-4 mr-2" />
                Gerenciar Grupos
              </button>
              <button
                type="button"
                onClick={handleFullscreen}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {isFullscreen ? (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5-5M4 4L4 9M15 9l5-5m0 0l-5-5M20 4v5M9 15l-5 5m0 0l5 5M4 20v-5M15 15l5 5m0 0l-5 5M20 20v-5" />
                    </svg>
                    Sair da Tela Cheia
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-9v4m0-4h-4m4 4l-5 5M4 16v4m0-4H4m4 4H4m4-4l-5 5m16-5v4m0-4h4m-4 4h4m-4-4l5 5" />
                    </svg>
                    Tela Cheia
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${isFullscreen ? 'hidden' : ''}`}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Adicionar CTO
              </button>
            </div>
          </div>
        </div>

        {/* Search Box */}
        <div className="mb-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar endereço..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="sr-only">Buscar</span>
            </button>
            <button
              onClick={handleFindCTO}
              disabled={isFindingCTO}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isFindingCTO ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Target className="h-4 w-4" />
              )}
              <span className="sr-only">Buscar CTO</span>
            </button>
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${isFullscreen ? 'h-full' : ''}`}>
          <div className={`grid grid-cols-1 ${isFullscreen ? 'h-full' : 'lg:grid-cols-3'}`}>
            {/* Map */}
            <div className={`${isFullscreen ? 'h-full' : 'lg:col-span-2 h-[600px]'} relative`}>
              <MapContainer
                center={initialPosition}
                zoom={13}
                id="map"
                style={{ height: '100%', width: '100%' }}
                ref={setMapRef}
              >
                <MapClickHandler onMapClick={handleMapClick} />
                <SearchHandler searchLocation={searchLocation} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {ctos.map((cto) => (
                  <Marker
                    key={cto.id}
                    position={[cto.latitude, cto.longitude]}
                    icon={getCTOIcon(cto)}
                    eventHandlers={{
                      click: () => {
                        setSelectedCTO(cto);
                        setShowPortDetails(true);
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{cto.name}</p>
                        {cto.group && (
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <span
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: cto.group.color }}
                            />
                            {cto.group.name}
                          </p>
                        )}
                        <p>{typeof cto.address === 'string' ? cto.address : 'Endereço não definido'}</p>
                        <p className="mt-1">
                          Portas: {cto.used_ports}/{cto.total_ports}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Legenda */}
              {!isFullscreen && (
                <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-md z-[1000]">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Grupos de CTO</h4>
                  <div className="space-y-1">
                    {Object.values(groupedCTOs).map(({ group, ctos }) => (
                      <div key={group.id} className="flex items-center text-sm">
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-gray-700">{group.name}</span>
                        <span className="text-gray-500 ml-2">({ctos.length})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CTO Details */}
            <div className={`border-t lg:border-t-0 ${isFullscreen ? 'hidden' : 'lg:border-l border-gray-200'}`}>
              {selectedCTO && showPortDetails ? (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900">{selectedCTO.name}</h2>
                    <p className="text-sm text-gray-500">{selectedCTO.address}</p>
                    <button
                      onClick={() => handleEdit(selectedCTO)}
                      className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </button>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Status das Portas</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: selectedCTO.total_ports }).map((_, index) => {
                        const portNumber = index + 1;
                        const status = getPortStatus(portNumber, selectedCTO.used_ports);
                        return (
                          <div
                            key={portNumber}
                            className={`
                              p-2 rounded-md text-center text-sm font-medium
                              ${status === 'free' 
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                              }
                            `}
                          >
                            {portNumber}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>Portas Livres: {selectedCTO.total_ports - selectedCTO.used_ports}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span>Portas Ocupadas: {selectedCTO.used_ports}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2">Selecione uma CTO no mapa para ver os detalhes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-2 text-gray-600">Carregando...</span>
        </div>
      )}

      {/* Add CTO Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 transition-opacity duration-200 z-[9999]"
          onClick={handleModalClick}
        >
          <div className={`bg-white rounded-lg shadow-xl max-w-md w-full transform transition-transform duration-200 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditing ? 'Editar CTO' : 'Adicionar Nova CTO'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome da CTO
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      id="latitude"
                      required
                      value={formData.latitude}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      id="longitude"
                      required
                      value={formData.longitude}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="total_ports" className="block text-sm font-medium text-gray-700">
                    Número de Portas
                  </label>
                  <select
                    name="total_ports"
                    id="total_ports"
                    required
                    value={formData.total_ports}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_ports: parseInt(e.target.value) }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="4">4 Portas</option>
                    <option value="8">8 Portas</option>
                    <option value="16">16 Portas</option>
                    <option value="32">32 Portas</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Endereço
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    O endereço é preenchido automaticamente ao clicar no mapa ou buscar uma localização
                  </p>
                </div>

                <div>
                  <label htmlFor="group_id" className="block text-sm font-medium text-gray-700">
                    Grupo
                  </label>
                  <select
                    name="group_id"
                    id="group_id"
                    value={formData.group_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, group_id: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Sem grupo</option>
                    {ctoGroups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    isEditing ? 'Salvar Alterações' : 'Adicionar CTO'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Management Modal */}
      {showGroupModal && (
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 transition-opacity duration-200 z-[9999]"
          onClick={(e) => e.target === e.currentTarget && setShowGroupModal(false)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Gerenciar Grupos de CTO
              </h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <form onSubmit={handleGroupSubmit} className="space-y-4">
                <div>
                  <label htmlFor="group-name" className="block text-sm font-medium text-gray-700">
                    Nome do Grupo
                  </label>
                  <input
                    type="text"
                    id="group-name"
                    required
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="group-description" className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    id="group-description"
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="group-color" className="block text-sm font-medium text-gray-700">
                    Cor do Grupo
                  </label>
                  <input
                    type="color"
                    id="group-color"
                    value={groupFormData.color}
                    onChange={(e) => setGroupFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Criar Grupo'
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Grupos Existentes</h4>
                <div className="space-y-2">
                  {ctoGroups.map(group => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-sm font-medium text-gray-900">{group.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este grupo?')) {
                            deleteCTOGroup(group.id)
                              .then(loadCTOGroups)
                              .catch(error => {
                                console.error('Error deleting group:', error);
                                alert('Erro ao excluir grupo');
                              });
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}