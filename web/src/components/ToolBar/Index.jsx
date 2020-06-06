import React, {PureComponent} from 'react';
import noop from 'lodash/noop';
import {Space, Popconfirm} from 'antd';
import styles from './styles.css';

const clearConfirmText = 'Are you sure to delete all?';

class Index extends PureComponent {
    render() {
        let {operations = {}, enabledInfo} = this.props;
        const {undo = noop, redo = noop, duplicate = noop, del = noop, clear = noop} = operations;
        if (!enabledInfo) {
            enabledInfo = {duplicate: true, del: true, clear: true};
        }
        return (
            <div className={styles.div_root}>
                <Space direction={"vertical"} size={0}>
                    <button
                        onClick={undo}
                        className={styles.btn_undo}
                        style={{display: "none"}}
                    />
                    <button
                        onClick={redo}
                        className={styles.btn_redo}
                        style={{display: "none"}}
                    />
                    <button
                        disabled={!enabledInfo.duplicate}
                        onClick={duplicate}
                        className={styles.btn_duplicate}
                    />
                    <button
                        disabled={!enabledInfo.del}
                        onClick={del}
                        className={styles.btn_delete}
                    />
                    {/*用hoc更优雅*/}
                    {!enabledInfo.clear &&
                    <button
                        disabled={true}
                        className={styles.btn_clear}
                    />
                    }
                    {enabledInfo.clear &&
                    <Popconfirm placement="left" title={clearConfirmText} onConfirm={clear} okText="Yes"
                                cancelText="No">
                        <button
                            className={styles.btn_clear}
                        />
                    </Popconfirm>
                    }
                </Space>

            </div>
        );
    }
}

export default Index;
