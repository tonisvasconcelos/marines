/**
 * VesselSearch Component
 * Search/filter input for vessels
 */

import React, { useState, useCallback } from 'react';
import styles from '../styles/sidebar.module.css';

export function VesselSearch({
  onSearchChange,
  placeholder = 'Search vessels...',
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchTerm(value);
      onSearchChange(value);
    },
    [onSearchChange]
  );

  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
      />
    </div>
  );
}

export default VesselSearch;
