/**
 * VesselSearch Component
 * Search bar for finding vessels using MyShipTracking API
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchVessels, type VesselSearchResult } from '../../api/ais';
import { FiSearch, FiX } from 'react-icons/fi';
import styles from './VesselSearch.module.css';

interface VesselSearchProps {
  onSelectVessel: (vessel: VesselSearchResult) => void;
}

export function VesselSearch({ onSelectVessel }: VesselSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading } = useQuery({
    queryKey: ['vessel-search', query],
    queryFn: () => searchVessels(query),
    enabled: query.length >= 3,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (vessel: VesselSearchResult) => {
    onSelectVessel(vessel);
    setQuery('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length >= 3);
  };

  return (
    <div ref={searchRef} className={styles.vesselSearch}>
      <div className={styles.searchInputContainer}>
        <FiSearch className={styles.searchIcon} size={18} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search vessels (min 3 characters)..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
        />
        {query && (
          <button
            className={styles.clearButton}
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className={styles.resultsDropdown}>
          {isLoading && <div className={styles.loading}>Searching...</div>}
          {!isLoading && results && results.length === 0 && (
            <div className={styles.noResults}>No vessels found</div>
          )}
          {!isLoading && results && results.length > 0 && (
            <div className={styles.resultsList}>
              {results.map((vessel, index) => (
                <div
                  key={`${vessel.mmsi}-${index}`}
                  className={styles.resultItem}
                  onClick={() => handleSelect(vessel)}
                >
                  <div className={styles.resultName}>{vessel.vessel_name}</div>
                  <div className={styles.resultDetails}>
                    {vessel.mmsi && <span>MMSI: {vessel.mmsi}</span>}
                    {vessel.imo && <span>IMO: {vessel.imo}</span>}
                    {vessel.vessel_type && <span>{vessel.vessel_type}</span>}
                    {vessel.flag && <span>{vessel.flag}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VesselSearch;

