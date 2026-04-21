const ACTION_UPDATE_STATE = 'PERSISTENT_DATA/ACTION_UPDATE_STATE';
export const WORK_HEIGHT = {
    P3D: 'WORK_HEIGHT_P3D',
    LASER: 'WORK_HEIGHT_LASER',
    PEN: 'WORK_HEIGHT_PEN'
};
export const WORK_HEIGHT_PLACE_HOLDER = 'WORK_HEIGHT_PLACE_HOLDER';
export const LASER_FRAMING_POWER = 'LASER_FRAMING_POWER';
const IS_TOOLTIP_DISPLAYED = "IS_TOOLTIP_DISPLAYED";
const ADVANCE = 'ADVANCE';
const Z_PRESETS_KEY = 'Z_PRESETS';

export const persistents = {
    getFloat: (key) => parseFloat(localStorage.getItem(key)),
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value)
};

if (persistents.get(IS_TOOLTIP_DISPLAYED) === null) {
    persistents.set(IS_TOOLTIP_DISPLAYED, true);
}
if (persistents.get(WORK_HEIGHT.P3D) === null) {
    persistents.set(WORK_HEIGHT.P3D, -90);
}
if (persistents.get(WORK_HEIGHT.PEN) === null) {
    persistents.set(WORK_HEIGHT.PEN, -90);
}
if (persistents.get(WORK_HEIGHT.LASER) === null) {
    persistents.set(WORK_HEIGHT.LASER, 0);
}
if (persistents.get(LASER_FRAMING_POWER) === null) {
    persistents.set(LASER_FRAMING_POWER, 0);
}

// 高级模式默认关闭
if (persistents.get(ADVANCE) === null) {
    persistents.set(ADVANCE, 0);
}
if (persistents.get(Z_PRESETS_KEY) === null) {
    persistents.set(Z_PRESETS_KEY, JSON.stringify([]));
}

const INITIAL_STATE = {
    workHeightP3d: persistents.getFloat(WORK_HEIGHT.P3D),
    workHeightPen: persistents.getFloat(WORK_HEIGHT.PEN),
    workHeightLaser: persistents.getFloat(WORK_HEIGHT.LASER),
    laserFramingPower: persistents.getFloat(LASER_FRAMING_POWER),
    isTooltipDisplayed: persistents.get(IS_TOOLTIP_DISPLAYED),
    // 高级模式
    advance: persistents.getFloat(ADVANCE),
    zPresets: JSON.parse(persistents.get(Z_PRESETS_KEY) || '[]')
};

console.log('初始状态')
console.log(INITIAL_STATE)

export const actions = {
    _updateState: (state) => {
        return {
            type: ACTION_UPDATE_STATE,
            state
        };
    },
    setWorkHeightP3d: (value) => (dispatch, getState) => {
        dispatch(actions._updateState({workHeightP3d: value}));
        persistents.set(WORK_HEIGHT.P3D, value);
    },
    setWorkHeightPen: (value) => (dispatch, getState) => {
        dispatch(actions._updateState({workHeightPen: value}));
        persistents.set(WORK_HEIGHT.PEN, value);
    },
    setWorkHeightLaser: (value) => (dispatch, getState) => {
        dispatch(actions._updateState({workHeightLaser: value}));
        persistents.set(WORK_HEIGHT.LASER, value);
    },
    setLaserFramingPower: (value) => (dispatch, getState) => {
        dispatch(actions._updateState({laserFramingPower: value}));
        persistents.set(LASER_FRAMING_POWER, value);
    },
    saveZPreset: (label, z) => (dispatch, getState) => {
        const presets = [...getState().persistentData.zPresets];
        const existing = presets.findIndex(p => p.label === label);
        if (existing >= 0) {
            presets[existing].z = z;
        } else {
            presets.push({label, z});
        }
        dispatch(actions._updateState({zPresets: presets}));
        persistents.set(Z_PRESETS_KEY, JSON.stringify(presets));
    },
    deleteZPreset: (label) => (dispatch, getState) => {
        const presets = getState().persistentData.zPresets.filter(p => p.label !== label);
        dispatch(actions._updateState({zPresets: presets}));
        persistents.set(Z_PRESETS_KEY, JSON.stringify(presets));
    },
    setIsTooltipDisplayed: (value) => (dispatch) => {
        const key = IS_TOOLTIP_DISPLAYED;
        dispatch(actions._updateState({isTooltipDisplayed: value}));
        persistents.set(key, value);
    },

    // 设置高级模式
    setAdvance: (value) => (dispatch) => {
        console.log(value, typeof value)
        dispatch(actions._updateState({advance: value}));
        persistents.set(ADVANCE, value);
    }
};

export default function reducer(state = INITIAL_STATE, action) {
    switch (action.type) {
        case ACTION_UPDATE_STATE:
            return Object.assign({}, state, action.state);
        default:
            return state;
    }
}
