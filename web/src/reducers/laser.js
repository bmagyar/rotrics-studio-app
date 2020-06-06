import _ from 'lodash';
import laserManager from "../containers/laser/lib/laserManager.js";

const SELECT_MODEL = 'laser/SELECT_MODEL';
const SET_MODEL_COUNT = 'laser/SET_MODEL_COUNT';

const SET_TRANSFORMATION = 'laser/SET_TRANSFORMATION';
const SET_CONFIG = 'laser/SET_CONFIG';
const SET_WORKING_PARAMETERS = 'laser/SET_WORKING_PARAMETERS';

const SET_ALL_PREVIEWED = 'laser/SET_ALL_PREVIEWED';
const SET_GCODE = 'laser/SET_GCODE';

const INITIAL_STATE = {
    model: null,
    modelCount: 0,
    transformation: null,
    config: null,
    working_parameters: null,
    isAllPreviewed: false, //是否所有model全部previewed
    gcode: "",
};

export const actions = {
    init: () => (dispatch) => {
        laserManager.on("onChangeModel", (model2d) => {
            dispatch(actions._setModelCount(laserManager.modelsParent.children.length));
            dispatch(actions._selectModel(model2d));
        });
        laserManager.on("onChangeTransformation", (transformation) => {
            dispatch(actions._setTransformation(_.cloneDeep(transformation)));
        });
        laserManager.on("onChangeConfig", (config) => {
            dispatch(actions._setConfig(_.cloneDeep(config)));
        });
        laserManager.on("onChangeWorkingParameters", (working_parameters) => {
            dispatch(actions._setWorkingParameters(_.cloneDeep(working_parameters)));
        });
        laserManager.on("onPreviewStatusChange", (isAllPreviewed) => {
            console.log("onPreviewStatusChange => " + isAllPreviewed)
            dispatch(actions._setAllPreviewed(isAllPreviewed));
        });
    },
    //modelsParent: three.Object3D
    setModelsParent: (modelsParent) => {
        laserManager.setModelsParent(modelsParent);
        return {type: null};
    },
    //model
    addModel: (model) => {
        laserManager.addModel(model);
        return {type: null};
    },
    selectModel: (model) => {
        laserManager.selectModel(model);
        return {type: null};
    },
    removeSelected: () => {
        laserManager.removeSelected();
        return {type: null};
    },
    removeAll: () => {
        laserManager.removeAll();
        return {type: null};
    },
    duplicateSelected: () => {
        laserManager.duplicateSelected();
        return {type: null};
    },
    undo: () => {
        console.log("undo")
        return {type: null};
    },
    redo: () => {
        console.log("redo")
        return {type: null};
    },
    //update settings
    updateTransformation: (key, value, preview) => {
        laserManager.updateTransformation(key, value, preview);
        return {type: null};
    },
    updateConfig: (key, value) => {
        laserManager.updateConfig(key, value);
        return {type: null};
    },
    updateWorkingParameters: (key, value) => {
        laserManager.updateWorkingParameters(key, value);
        return {type: null};
    },
    _setModelCount: (count) => {
        return {
            type: SET_MODEL_COUNT,
            value: count
        };
    },
    _setTransformation: (transformatione) => {
        return {
            type: SET_TRANSFORMATION,
            value: transformatione
        };
    },
    _setConfig: (config) => {
        return {
            type: SET_CONFIG,
            value: config
        };
    },
    _setWorkingParameters: (workingParameters) => {
        return {
            type: SET_WORKING_PARAMETERS,
            value: workingParameters
        };
    },
    _setAllPreviewed: (isAllPreviewed) => {
        return {
            type: SET_ALL_PREVIEWED,
            value: isAllPreviewed
        };
    },
    _selectModel: (model) => {
        return {
            type: SELECT_MODEL,
            value: model
        };
    },
    //g-code
    generateGcode: () => {
        const gcode = laserManager.generateGcode();
        return {
            type: SET_GCODE,
            value: gcode
        };
    },
};

export default function reducer(state = INITIAL_STATE, action) {
    switch (action.type) {
        case SELECT_MODEL:
            const model = action.value;
            if (model) {
                const {transformation, config, working_parameters} = model.settings;
                return Object.assign({}, state, {model, transformation, config, working_parameters});
            } else {
                return Object.assign({}, state, {
                    model: null,
                    transformation: null,
                    config: null,
                    working_parameters: null
                });
            }
        case SET_MODEL_COUNT:
            return Object.assign({}, state, {modelCount: action.value, gcode: ""});
        case SET_TRANSFORMATION:
            return Object.assign({}, state, {transformation: action.value, gcode: ""});
        case SET_CONFIG:
            return Object.assign({}, state, {config: action.value, gcode: ""});
        case SET_WORKING_PARAMETERS:
            return Object.assign({}, state, {working_parameters: action.value, gcode: ""});
        case SET_ALL_PREVIEWED:
            return Object.assign({}, state, {isAllPreviewed: action.value, gcode: ""});
        case SET_GCODE:
            return Object.assign({}, state, {gcode: action.value});
        default:
            return state;
    }
}