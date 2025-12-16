// state.js

export let state = {
    // Session Data
    currentUser: null,
    username: null,
    loginCode: null,
    currentLanguage: 'en',
    items: [],
    pricingItems: [],
    suppliers: [],
    branches: [],
    sections: [],
    transactions: [],
    payments: [],
    purchaseOrders: [],
    purchaseOrderItems: [],
    activityLog: [],
    allUsers: [],
    allRoles: [],
    backups: [],

    // Transaction Working Lists
    currentReceiveList: [],
    currentTransferList: [],
    currentPOList: [],
    currentReturnList: [],
    currentEditingPOList: [],
    currentAdjustmentList: [],
    currentButcheryList: [],
    
    // Specific Transaction State
    parentButcheryItem: null,

    // UI State & Selections
    modalSelections: new Set(),
    invoiceModalSelections: new Set(),
    reportSelectedBranches: new Set(),
    reportSelectedSections: new Set(),
    reportSelectedItems: new Set(),
    
    // Modal Helpers
    currentSelectionModal: {
        type: null,
        tempSelections: new Set()
    },
    adminContextPromise: {},
};

export function setState(key, value) {
    state[key] = value;
}

export function resetStateLists() {
    state.currentReceiveList = [];
    state.currentTransferList = [];
    state.currentButcheryList = [];
    state.currentPOList = [];
    state.currentReturnList = [];
    state.currentEditingPOList = [];
    state.currentAdjustmentList = [];
    state.modalSelections.clear();
    state.invoiceModalSelections.clear();
}
