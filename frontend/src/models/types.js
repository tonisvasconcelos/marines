/**
 * @typedef {Object} Tenant
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} billingPlan
 * @property {string} status
 * @property {string} defaultCountryCode
 * @property {string} defaultLocale
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 */

/**
 * @typedef {Object} TenantUser
 * @property {string} tenantId
 * @property {string} userId
 * @property {string} role - 'ADMIN' | 'OPERATOR' | 'VIEWER'
 */

/**
 * @typedef {Object} Country
 * @property {string} isoCode
 * @property {string} name
 */

/**
 * @typedef {Object} Port
 * @property {string} id
 * @property {string} unlocode
 * @property {string} name
 * @property {string} countryCode
 * @property {Object} coordinates - { lat: number, lon: number }
 */

/**
 * @typedef {Object} Vessel
 * @property {string} id
 * @property {string} tenantId
 * @property {string} imo
 * @property {string} mmsi
 * @property {string} callSign
 * @property {string} name
 * @property {string} flag
 */

/**
 * @typedef {'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'} PortCallStatus
 */

/**
 * @typedef {Object} PortCall
 * @property {string} id
 * @property {string} tenantId
 * @property {string} vesselId
 * @property {string} portId
 * @property {string} countryCode
 * @property {string} eta - ISO date string
 * @property {string} etd - ISO date string
 * @property {PortCallStatus} status
 * @property {string} localReferenceType - e.g. 'BR_DUV', 'GENERIC'
 * @property {string} localReferenceNumber
 * @property {Vessel} vessel - populated
 * @property {Port} port - populated
 */

/**
 * @typedef {Object} Escala
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {string} portId
 * @property {string} terminal
 * @property {string} plannedEta
 * @property {string} plannedEtd
 * @property {string} actualEta
 * @property {string} actualEtd
 * @property {string} status
 */

/**
 * @typedef {Object} BerthStay
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {string} berth
 * @property {string} pier
 * @property {string} operationType
 * @property {string} startTime
 * @property {string} endTime
 * @property {number} draftArrival
 * @property {number} draftDeparture
 */

/**
 * @typedef {'ARRIVAL' | 'ANCHORAGE' | 'ALONGSIDE' | 'DEPARTURE'} EventType
 */

/**
 * @typedef {Object} ArrivalDeparture
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {EventType} eventType
 * @property {string} timestamp
 * @property {string} terminal
 * @property {string} remarks
 */

/**
 * @typedef {'IMPORT' | 'EXPORT' | 'CABOTAGE'} ManifestType
 */

/**
 * @typedef {Object} Manifest
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {string} manifestNumber
 * @property {ManifestType} type
 * @property {string} cargoType
 * @property {number} blCount
 */

/**
 * @typedef {Object} BillOfLading
 * @property {string} id
 * @property {string} tenantId
 * @property {string} manifestId
 * @property {string} blNumber
 * @property {string} shipper
 * @property {string} consignee
 * @property {string} cargoDescription
 * @property {number} weight
 * @property {number} volume
 * @property {string} containerInfo
 */

/**
 * @typedef {'ON_BOARD' | 'DISEMBARKED' | 'CANCELLED'} PassengerStatus
 */

/**
 * @typedef {Object} Passenger
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {string} fullName
 * @property {string} document
 * @property {string} nationality
 * @property {string} embarkPort
 * @property {string} disembarkPort
 * @property {string} cabin
 * @property {PassengerStatus} status
 */

/**
 * @typedef {Object} CrewMember
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {string} fullName
 * @property {string} rank
 * @property {string} document
 * @property {string} nationality
 * @property {string} onBoardStatus
 */

/**
 * @typedef {'PASSENGER' | 'CREW'} TravellerType
 */

/**
 * @typedef {'OPEN' | 'CLEARED'} PendencyStatus
 */

/**
 * @typedef {Object} TravellerPendency
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {TravellerType} travellerType
 * @property {string} travellerId
 * @property {string} authority
 * @property {string} reason
 * @property {PendencyStatus} status
 * @property {string} notes
 */

/**
 * @typedef {Object} IngressoABordo
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {string} personName
 * @property {string} document
 * @property {string} role
 * @property {string} company
 * @property {string} timeIn
 * @property {string} timeOut
 * @property {string} remarks
 */

/**
 * @typedef {Object} FeeDues
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {string} feeType - e.g. 'BR_FUNAPOL', 'PORT_DUES', 'PILOTAGE'
 * @property {string} calculationBase
 * @property {number} amountDue
 * @property {number} amountPaid
 * @property {string} paymentDate
 * @property {'DUE' | 'PAID' | 'WAIVED'} status
 * @property {string} referenceNumber
 */

/**
 * @typedef {'APPROVAL' | 'REQUIREMENT' | 'IMPEDIMENT'} ApprovalType
 */

/**
 * @typedef {Object} ApprovalImpediment
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {string} authority
 * @property {ApprovalType} type
 * @property {string} description
 * @property {string} status
 * @property {string} dueDate
 * @property {string} clearedDate
 */

/**
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} tenantId
 * @property {string} portCallId
 * @property {string} fileName
 * @property {string} fileType
 * @property {string} storagePath
 * @property {string} description
 */

/**
 * @typedef {Object} VesselPosition
 * @property {string} id
 * @property {string} tenantId
 * @property {string} vesselId
 * @property {string} timestamp
 * @property {number} lat
 * @property {number} lon
 * @property {number} sog - speed over ground
 * @property {number} cog - course over ground
 * @property {number} heading
 * @property {string} navStatus
 * @property {string} source
 */

/**
 * @typedef {Object} TenantAisConfig
 * @property {string} tenantId
 * @property {string} provider
 * @property {string} apiKey
 * @property {number} pollFrequencyMinutes
 * @property {number} trackHistoryHours
 */

/**
 * @typedef {Object} JurisdictionConfig
 * @property {string} jurisdictionKey - e.g. 'BR_PSP', 'GENERIC'
 * @property {string} countryCode
 * @property {string} portId
 * @property {string} localReferenceLabel
 * @property {string} localReferenceFormat
 * @property {boolean} usesFunapol
 * @property {boolean} usesTravellerPendencies
 */

/**
 * @typedef {Object} PortCallLocalData
 * @property {string} portCallId
 * @property {string} jurisdictionKey
 * @property {Object} jsonPayload
 */

