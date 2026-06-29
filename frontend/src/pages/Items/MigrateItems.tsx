import React from 'react';

interface Props {
  onMigrate: () => void;
  onClear: () => void;
  onCancel: () => void;
}

const MigrateInventory = ({ onMigrate, onClear, onCancel }: Props) => {
  return (
    <div>
      <p className="text-muted-theme mb-4">
        This character has items in their inventory. What would you like to do with them?
      </p>
      <div className="d-flex flex-column gap-2">
        <div
          className="card-theme p-3"
          style={{ cursor: 'pointer' }}
          onClick={onMigrate}
        >
          <p className="text-theme mb-0" style={{ fontWeight: 600 }}>Migrate Items</p>
          <small className="text-muted-theme">Move all existing items to the new campaign.</small>
        </div>
        <div
          className="card-theme p-3"
          style={{ cursor: 'pointer' }}
          onClick={onClear}
        >
          <p className="text-theme mb-0" style={{ fontWeight: 600 }}>Clear Inventory</p>
          <small className="text-muted-theme">Remove all items from this character's inventory.</small>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary mt-2"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MigrateInventory;