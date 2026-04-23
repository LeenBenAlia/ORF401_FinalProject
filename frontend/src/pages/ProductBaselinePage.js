import React, { useState, useMemo } from 'react';
import { useAuth } from '../auth';

// Mock supplier data - in production, this would come from the API
const SUPPLIER_DATA = {
  Tesla: [
    {
      id: 'T-001',
      supplier: 'Panthera Metals',
      country: 'Germany',
      currency: 'EUR',
      items: [
        { name: 'Hardened steel bracket', quantity: 50, unitCost: 12.50, currency: 'EUR', category: 'Structural' },
        { name: 'Aluminum extrusion', quantity: 25, unitCost: 8.75, currency: 'EUR', category: 'Structural' },
        { name: 'Copper wiring harness', quantity: 100, unitCost: 2.30, currency: 'EUR', category: 'Electrical' },
      ]
    },
    {
      id: 'T-002',
      supplier: 'Magnaflux',
      country: 'Mexico',
      currency: 'USD',
      items: [
        { name: 'High-strength fasteners', quantity: 200, unitCost: 0.45, currency: 'USD', category: 'Fasteners' },
        { name: 'Steel reinforcement rods', quantity: 30, unitCost: 15.20, currency: 'USD', category: 'Structural' },
        { name: 'Thermal insulation foam', quantity: 75, unitCost: 3.10, currency: 'USD', category: 'Insulation' },
      ]
    },
  ],
  SpaceX: [
    {
      id: 'S-001',
      supplier: 'Orbital Components',
      country: 'France',
      currency: 'EUR',
      items: [
        { name: 'Avionics housings', quantity: 10, unitCost: 450.00, currency: 'EUR', category: 'Avionics' },
        { name: 'Carbon fiber panels', quantity: 5, unitCost: 280.00, currency: 'EUR', category: 'Structural' },
      ]
    },
  ],
  Nvidia: [
    {
      id: 'N-001',
      supplier: 'Silicon Foundry',
      country: 'Taiwan',
      currency: 'TWD',
      items: [
        { name: 'High-density interposers', quantity: 1000, unitCost: 45.00, currency: 'TWD', category: 'Semiconductor' },
        { name: 'Thermal interface material', quantity: 500, unitCost: 12.50, currency: 'TWD', category: 'Thermal' },
      ]
    },
  ],
};

// Product configurations for Tesla Model 1
const PRODUCT_CONFIGURATIONS = {
  'Tesla Model 1': {
    name: 'Tesla Model 1',
    baseCost: 35000, // Base manufacturing cost
    components: {
      'Structural': { required: true, minItems: 2, maxItems: 4 },
      'Electrical': { required: true, minItems: 1, maxItems: 3 },
      'Fasteners': { required: true, minItems: 1, maxItems: 2 },
      'Insulation': { required: false, minItems: 0, maxItems: 2 },
      'Thermal': { required: false, minItems: 0, maxItems: 1 },
    }
  }
};

function ProductBaselinePage() {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState('Tesla Model 1');
  const [selectedComponents, setSelectedComponents] = useState({});
  const [simulationResults, setSimulationResults] = useState(null);

  const company = user?.company || 'Tesla';
  const supplierData = SUPPLIER_DATA[company] || SUPPLIER_DATA['Tesla'] || [];
  const productConfig = PRODUCT_CONFIGURATIONS[selectedProduct];

  // Flatten all available items from suppliers
  const availableItems = useMemo(() => {
    const items = [];
    supplierData.forEach(supplier => {
      supplier.items.forEach(item => {
        items.push({
          ...item,
          supplier: supplier.supplier,
          supplierId: supplier.id,
          country: supplier.country,
          supplierCurrency: supplier.currency,
        });
      });
    });
    return items;
  }, [supplierData]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = {};
    availableItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [availableItems]);

  const handleComponentSelection = (category, itemId, selected) => {
    setSelectedComponents(prev => ({
      ...prev,
      [category]: selected ? [...(prev[category] || []), itemId] : (prev[category] || []).filter(id => id !== itemId)
    }));
  };

  const runSimulation = () => {
    if (!productConfig) return;

    const selectedItems = [];
    let totalCost = productConfig.baseCost;
    let totalWeight = 0;

    Object.entries(selectedComponents).forEach(([category, itemIds]) => {
      itemIds.forEach(itemId => {
        const item = availableItems.find(i => `${i.supplierId}-${i.name}` === itemId);
        if (item) {
          const cost = item.unitCost * item.quantity;
          selectedItems.push({
            ...item,
            totalCost: cost,
            fullId: itemId
          });
          totalCost += cost;
          // Estimate weight (simplified)
          totalWeight += item.quantity * 0.1;
        }
      });
    });

    // Check requirements
    const missingRequired = Object.entries(productConfig.components)
      .filter(([cat, config]) => config.required && (!selectedComponents[cat] || selectedComponents[cat].length === 0))
      .map(([cat]) => cat);

    const warnings = [];
    Object.entries(productConfig.components).forEach(([cat, config]) => {
      const selected = selectedComponents[cat] || [];
      if (selected.length < config.minItems) {
        warnings.push(`Category ${cat} has fewer than minimum required items`);
      }
      if (selected.length > config.maxItems) {
        warnings.push(`Category ${cat} exceeds maximum allowed items`);
      }
    });

    setSimulationResults({
      selectedItems,
      totalCost,
      totalWeight,
      missingRequired,
      warnings,
      currency: 'USD' // Assume USD for final display
    });
  };

  const resetSimulation = () => {
    setSelectedComponents({});
    setSimulationResults(null);
  };

  // Debug: Simple render test
  return (
    <main className="page page--wide">
      <header className="page__header">
        <p className="eyebrow">Product baseline simulation</p>
        <h1>Cost baseline builder</h1>
        <p className="lede lede--muted">
          Build and simulate different product configurations using supplier quotes. Company: {company}
        </p>
      </header>

      <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '8px', margin: '2rem 0' }}>
        <h2>Debug Info</h2>
        <p><strong>Company:</strong> {company}</p>
        <p><strong>Supplier Data Items:</strong> {supplierData.length}</p>
        <p><strong>Product Config:</strong> {productConfig ? 'Loaded' : 'Not Found'}</p>
        <p><strong>User:</strong> {user ? user.company : 'Not logged in'}</p>
      </div>

      <div className="simulation-grid">
        <section className="panel simulation-panel">
          <h2>Product Configuration</h2>
          <p>This is a test render. Full functionality coming soon.</p>
        </section>

        <section className="panel simulation-panel">
          <h2>Simulation Results</h2>
          <p>Results will appear here after running a simulation.</p>
        </section>
      </div>
    </main>
  );
}

export default ProductBaselinePage;