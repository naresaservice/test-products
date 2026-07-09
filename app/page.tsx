'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Input,
  Select,
  Tag,
  Typography,
  Card,
  Space,
  Button,
  message,
  Layout,
  Divider,
  Tooltip,
} from 'antd';
import { SearchOutlined, FilterOutlined, FileTextOutlined, UndoOutlined } from '@ant-design/icons';
import { Product } from '@/lib/csv';
import ProductModal from '@/components/ProductModal';

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;
const { Option } = Select;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewerFilter, setReviewerFilter] = useState<string>('Todos');

  // Fetch all products from CSV API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      const result = await response.json();
      if (result.success) {
        setProducts(result.data);
      } else {
        message.error('No se pudieron cargar los productos');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      message.error('Error al conectar con la API de productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('Todos');
    setReviewerFilter('Todos');
    message.info('Filtros restablecidos');
  };

  // Filter products client-side based on search and status
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.nombre.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'Todos' || product.estatus === statusFilter;

      const matchesReviewer =
        reviewerFilter === 'Todos' ||
        (reviewerFilter === 'Sin revisar' && !product.revisadoPor) ||
        product.revisadoPor === reviewerFilter;

      return matchesSearch && matchesStatus && matchesReviewer;
    });
  }, [products, searchQuery, statusFilter, reviewerFilter]);

  const openProductReview = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  // Status tag mapper helper
  const renderStatusTag = (status: string) => {
    switch (status) {
      case 'Por revisar':
        return (
          <Tag color="default" className="px-2 py-0.5 rounded font-medium">
            Por revisar
          </Tag>
        );
      case 'En revisión':
        return (
          <Tag color="processing" className="px-2 py-0.5 rounded font-medium">
            En revisión
          </Tag>
        );
      case 'Autorizado':
        return (
          <Tag color="success" className="px-2 py-0.5 rounded font-medium">
            Autorizado
          </Tag>
        );
      case 'Requiere ajustes':
        return (
          <Tag color="error" className="px-2 py-0.5 rounded font-medium">
            Requiere ajustes
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Brand tag mapper helper
  const renderMarcaTag = (marca: string) => {
    switch (marca) {
      case 'Naresa':
        return (
          <Tag color="orange" className="px-2 py-0.5 rounded font-medium">
            Naresa
          </Tag>
        );
      case 'Equilinea':
        return (
          <Tag color="green" className="px-2 py-0.5 rounded font-medium">
            Equilinea
          </Tag>
        );
      case 'Proquip':
        return (
          <Tag color="blue" className="px-2 py-0.5 rounded font-medium">
            Proquip
          </Tag>
        );
      default:
        return <Tag>{marca}</Tag>;
    }
  };

  // Define table columns
  const columns = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: '10%',
      render: (text: string, record: Product) => (
        <Button
          type="link"
          className="p-0 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400"
          onClick={() => openProductReview(record)}
        >
          {text}
        </Button>
      ),
      sorter: (a: Product, b: Product) => a.codigo.localeCompare(b.codigo),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      align: 'left' as const,
      ellipsis: true,
      width: '300px',
      render: (text: string, record: Product) => (
        <Tooltip title={text.trim()} placement="topLeft">
          <Button
            type="link"
            style={{ padding: 0, textAlign: 'left' }}
            className="p-0 font-medium text-left hover:text-indigo-600 dark:hover:text-indigo-400 flex justify-start items-center w-full h-auto"
            onClick={() => openProductReview(record)}
          >
            <span className="truncate max-w-[300px] block">{text.trim()}</span>
          </Button>
        </Tooltip>
      ),
      sorter: (a: Product, b: Product) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: 'Marca',
      dataIndex: 'marca',
      key: 'marca',
      width: '12%',
      render: (marca: string) => renderMarcaTag(marca),
      sorter: (a: Product, b: Product) => a.marca.localeCompare(b.marca),
      filters: [
        { text: 'Naresa', value: 'Naresa' },
        { text: 'Equilinea', value: 'Equilinea' },
        { text: 'Proquip', value: 'Proquip' },
      ],
      onFilter: (value: any, record: Product) => record.marca === value,
    },
    {
      title: 'Estatus',
      dataIndex: 'estatus',
      key: 'estatus',
      width: '16%',
      render: (status: string) => renderStatusTag(status),
      filters: [
        { text: 'Por revisar', value: 'Por revisar' },
        { text: 'En revisión', value: 'En revisión' },
        { text: 'Autorizado', value: 'Autorizado' },
        { text: 'Requiere ajustes', value: 'Requiere ajustes' },
      ],
      onFilter: (value: any, record: Product) => record.estatus === value,
    },
    {
      title: 'Asignado a',
      dataIndex: 'revisadoPor',
      key: 'revisadoPor',
      width: '15%',
      render: (text: string) =>
        text ? (
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{text}</span>
        ) : (
          <Text type="secondary">-</Text>
        ),
      sorter: (a: Product, b: Product) => a.revisadoPor.localeCompare(b.revisadoPor),
    },
    {
      title: 'Observaciones',
      dataIndex: 'observaciones',
      key: 'observaciones',
      width: '23%',
      render: (text: string) => (
        <Paragraph
          ellipsis={{ rows: 1, tooltip: text || undefined }}
          style={{ margin: 0 }}
          type={text ? 'danger' : 'secondary'}
          className="text-xs"
        >
          {text || '-'}
        </Paragraph>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <Content className="py-12 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        {/* Header section with Premium Aesthetic */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-indigo-600 rounded-lg text-white text-xs flex items-center justify-center shadow-md shadow-indigo-500/20">
                <FileTextOutlined style={{ fontSize: '18px' }} />
              </span>
              <Title
                level={2}
                style={{ margin: 0, fontWeight: 700 }}
                className="text-zinc-800 dark:text-zinc-100"
              >
                Verificador de Productos 360°
              </Title>
            </div>
            <Text type="secondary" className="text-sm">
              Administración y control de calidad de fotogramas 360° de productos NARESA.
            </Text>
          </div>

          <Button
            icon={<UndoOutlined />}
            onClick={fetchProducts}
            loading={loading}
            className="self-start md:self-auto hover:border-indigo-500 hover:text-indigo-600"
          >
            Actualizar Tabla
          </Button>
        </div>

        {/* Filter controls */}
        <Card className="mb-6 shadow-sm border-zinc-200/80 dark:border-zinc-800 rounded-xl">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
              <Input
                placeholder="Buscar por código o nombre..."
                prefix={<SearchOutlined className="text-zinc-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-md rounded-lg"
                allowClear
              />
              <Space className="w-full sm:w-auto">
                <Select
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                  style={{ width: 170 }}
                  className="rounded-lg"
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="Todos">Todos los Estatus</Option>
                  <Option value="Por revisar">Por revisar</Option>
                  <Option value="En revisión">En revisión</Option>
                  <Option value="Autorizado">Autorizado</Option>
                  <Option value="Requiere ajustes">Requiere ajustes</Option>
                </Select>

                <Select
                  value={reviewerFilter}
                  onChange={(value) => setReviewerFilter(value)}
                  style={{ width: 170 }}
                  className="rounded-lg"
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="Todos">Todos los Asignados</Option>
                  <Option value="Sin revisar">Sin asignar</Option>
                  <Option value="Ricardo">Ricardo</Option>
                  <Option value="Elizabeth">Elizabeth</Option>
                </Select>

                {(searchQuery || statusFilter !== 'Todos' || reviewerFilter !== 'Todos') && (
                  <Button type="text" onClick={handleResetFilters} danger className="text-xs px-2">
                    Limpiar
                  </Button>
                )}
              </Space>
            </div>

            <div className="text-xs text-zinc-400 self-end sm:self-auto">
              Mostrando {filteredProducts.length} de {products.length} productos
            </div>
          </div>
        </Card>

        {/* Main Products Table */}
        <Card
          className="shadow-md border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden p-0"
          bodyStyle={{ padding: 0 }}
        >
          <Table
            dataSource={filteredProducts}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '50', '100'],
              showTotal: (total) => `Total ${total} productos`,
            }}
            className="custom-table"
          />
        </Card>

        {/* Review/Edit Modal */}
        <ProductModal
          visible={modalVisible}
          product={selectedProduct}
          onClose={() => {
            setModalVisible(false);
            setSelectedProduct(null);
          }}
          onSaveSuccess={fetchProducts}
        />
      </Content>
    </Layout>
  );
}
