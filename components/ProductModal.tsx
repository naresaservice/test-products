'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, Row, Col, Button, Space, Typography, message } from 'antd';
import { Formik, useFormikContext } from 'formik';
import { Product } from '@/lib/csv';
import ThreeSixtyViewer from './ThreeSixtyViewer';

const { Option } = Select;
const { Text } = Typography;

interface ProductModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onSaveSuccess: () => void;
}

// Inner helper component to connect Ant Design Modal footer buttons to Formik state
function ModalFooterButtons({ onCancel }: { onCancel: () => void }) {
  const { submitForm, isSubmitting, dirty } = useFormikContext();
  return (
    <Space>
      <Button onClick={onCancel}>Cancelar</Button>
      <Button type="primary" onClick={submitForm} loading={isSubmitting}>
        Guardar
      </Button>
    </Space>
  );
}

// Inner form component to access Formik's values and errors
function FormContent() {
  const { values, errors, touched, setFieldValue } = useFormikContext<{
    revisadoPor: string;
    estatus: string;
    observaciones: string;
  }>();

  return (
    <Form layout="vertical">
      {/* Asignado A */}
      <Form.Item
        label="Asignado a"
        validateStatus={touched.revisadoPor && errors.revisadoPor ? 'error' : ''}
        help={touched.revisadoPor && errors.revisadoPor}
      >
        <Select
          value={values.revisadoPor || undefined}
          placeholder="Selecciona un asignado (vacío default)"
          allowClear
          onChange={(value) => setFieldValue('revisadoPor', value || '')}
        >
          <Option value="Ricardo">Ricardo</Option>
          <Option value="Elizabeth">Elizabeth</Option>
        </Select>
      </Form.Item>

      {/* Estatus */}
      <Form.Item
        label="Estatus"
        validateStatus={touched.estatus && errors.estatus ? 'error' : ''}
        help={touched.estatus && errors.estatus}
      >
        <Select
          value={values.estatus}
          onChange={(value) => setFieldValue('estatus', value)}
        >
          <Option value="Por revisar">Por revisar</Option>
          <Option value="En revisión">En revisión</Option>
          <Option value="Autorizado">Autorizado</Option>
          <Option value="Requiere ajustes">Requiere ajustes</Option>
        </Select>
      </Form.Item>

      {/* Observaciones (Conditional) */}
      {values.estatus === 'Requiere ajustes' && (
        <Form.Item
          label="Observaciones"
          required
          validateStatus={touched.observaciones && errors.observaciones ? 'error' : ''}
          help={touched.observaciones && errors.observaciones}
        >
          <Input.TextArea
            rows={4}
            placeholder="Ingrese los ajustes requeridos..."
            value={values.observaciones}
            onChange={(e) => setFieldValue('observaciones', e.target.value)}
          />
        </Form.Item>
      )}
    </Form>
  );
}

export default function ProductModal({ visible, product, onClose, onSaveSuccess }: ProductModalProps) {
  const [initialValues, setInitialValues] = useState({
    revisadoPor: '',
    estatus: 'En revisión',
    observaciones: '',
  });

  const [formKey, setFormKey] = useState(0); // Key to force re-render Formik when values initialize

  useEffect(() => {
    if (visible && product) {
      // Get cached reviewer from localStorage if the product has none set
      let defaultReviewer = '';
      if (typeof window !== 'undefined') {
        defaultReviewer = localStorage.getItem('defaultReviewer') || '';
      }

      setInitialValues({
        revisadoPor: product.revisadoPor || defaultReviewer,
        // If current product status is "Por revisar", default is "En revisión", otherwise keep product's status
        estatus: product.estatus === 'Por revisar' ? 'En revisión' : product.estatus,
        observaciones: product.observaciones || '',
      });
      
      // Increment key to reset formik instance
      setFormKey(prev => prev + 1);
    }
  }, [visible, product]);

  if (!product) return null;

  // Handle Cancel / Modal Closure
  const handleCancelAttempt = (dirty: boolean) => {
    if (dirty) {
      Modal.confirm({
        title: '¿Perder cambios?',
        content: 'Tiene cambios sin guardar en el formulario. ¿Está seguro que desea perder los cambios?',
        okText: 'Sí, salir',
        cancelText: 'No, continuar editando',
        okButtonProps: { danger: true },
        onOk() {
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  const handleFormSubmit = async (
    values: { revisadoPor: string; estatus: string; observaciones: string },
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          codigo: product.codigo,
          marca: product.marca,
          revisadoPor: values.revisadoPor,
          estatus: values.estatus,
          observaciones: values.estatus === 'Requiere ajustes' ? values.observaciones : '',
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Save reviewer to localStorage if one was selected
        if (values.revisadoPor && typeof window !== 'undefined') {
          localStorage.setItem('defaultReviewer', values.revisadoPor);
        }
        
        message.success('Producto guardado exitosamente');
        onSaveSuccess();
        onClose();
      } else {
        message.error(result.error || 'Error al guardar el producto');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      message.error('Ocurrió un error al enviar la información');
    } finally {
      setSubmitting(false);
    }
  };

  const validateForm = (values: { revisadoPor: string; estatus: string; observaciones: string }) => {
    const errors: Record<string, string> = {};
    if (values.estatus === 'Requiere ajustes' && !values.observaciones.trim()) {
      errors.observaciones = 'Las observaciones son obligatorias cuando el estatus es "Requiere ajustes"';
    }
    return errors;
  };

  return (
    <Formik
      key={formKey}
      initialValues={initialValues}
      validate={validateForm}
      onSubmit={handleFormSubmit}
    >
      {({ dirty }) => (
        <Modal
          open={visible}
          title={
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Text className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                {product.codigo} - {product.nombre} ({product.marca})
              </Text>
            </div>
          }
          onCancel={() => handleCancelAttempt(dirty)}
          width="90vw"
          style={{ top: '5vh', height: '90vh', maxWidth: '90vw' }}
          styles={{
            body: { 
              height: 'calc(90vh - 120px)', 
              overflowY: 'auto',
              padding: '16px 24px'
            }
          }}
          destroyOnClose
          footer={<ModalFooterButtons onCancel={() => handleCancelAttempt(dirty)} />}
        >
          <div className="py-4">
            <Row gutter={[24, 24]} align="middle">
              {/* Left Column: 360 Rotation Viewer */}
              <Col xs={24} md={15}>
                <div className="flex flex-col justify-center">
                  <ThreeSixtyViewer codigo={product.codigo} marca={product.marca} />
                </div>
              </Col>

              {/* Right Column: Edit/Review Form */}
              <Col xs={24} md={9}>
                <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                  <FormContent />
                </div>
              </Col>
            </Row>
          </div>
        </Modal>
      )}
    </Formik>
  );
}
