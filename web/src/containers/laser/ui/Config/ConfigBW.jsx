import React, {PureComponent} from 'react';
import {Checkbox, Select, Space, Row, Col, Divider} from 'antd';
import laserManager from "../../lib/laserManager.js";
import {toFixed} from '../../../../../shared/lib/numeric-utils.js';
import styles from './styles.css';
import NumberInput from '../../../../components/NumberInput/Index.jsx';
import Line from '../../../../components/Line/Index.jsx'

class ConfigBW extends PureComponent {
    state = {
        model2d: null,
        config: null
    };

    componentDidMount() {
        laserManager.on("onChange", (model2d) => {
            let config = model2d ? _.cloneDeep(model2d.settings.config) : null;
            // console.log("change: " + JSON.stringify(config, null, 2))
            this.setState({
                model2d,
                config
            })
        });
    }

    actions = {
        setInvert: (e) => {
            laserManager.updateConfig("invert", e.target.checked)
        },
        setBW: (value) => {
            laserManager.updateConfig("bw", value)
        },
        setDensity: (value) => {
            laserManager.updateConfig("density", value)
        },
        setLineDirection: (value) => {
            laserManager.updateConfig("line_direction", value)
        }
    };

    render() {
        if (!this.state.model2d || this.state.model2d.fileType !== "bw") {
            return null;
        }

        const actions = this.actions;
        const {config} = this.state;
        const {invert, bw, line_direction, density} = config.children;
        const directionOptions = [];
        Object.keys(line_direction.options).forEach((key) => {
            const option = line_direction.options[key];
            directionOptions.push(<Select.Option key={key} value={option}>{key}</Select.Option>)
        });
        return (
            <React.Fragment>
                <Line/>
                <h4>{config.label}</h4>
                <Row>
                    <Col span={11}>
                        <span>{invert.label}</span>
                    </Col>
                    <Col span={8} push={5}>
                        <Checkbox checked={invert.default_value} onChange={actions.setInvert}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={11}>
                        <span>{bw.label}</span>
                    </Col>
                    <Col span={8} push={5}>
                        <NumberInput min={bw.minimum_value} max={bw.maximum_value}
                                     value={toFixed(bw.default_value, 0)}
                                     onChange={actions.setBW}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={11}>
                        <span>{line_direction.label}</span>
                    </Col>
                    <Col span={8} push={5}>
                        <Select value={line_direction.default_value} style={{width: 110}}
                                onChange={actions.setLineDirection}>
                            {directionOptions}></Select>
                    </Col>
                </Row>
                <Row>
                    <Col span={11}>
                        <span>{density.label}</span>
                        <span>{"(" + density.unit + ")"}</span>
                    </Col>
                    <Col span={8} push={5}>
                        <NumberInput min={density.minimum_value} max={density.maximum_value}
                                     value={toFixed(density.default_value, 0)}
                                     onChange={actions.setDensity}/>
                    </Col>
                </Row>


            </React.Fragment>
        );
    }
}

export default ConfigBW;
