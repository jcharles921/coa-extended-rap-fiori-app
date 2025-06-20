sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/ui/layout/form/SimpleForm"
], function (MessageToast, MessageBox, Dialog, Button, Label, Select, Item, SimpleForm) {
    "use strict";

    return {
        /**
         * Header button handler: shows a status‐picker then calls the selected RAP action.
         *
         * @param {sap.ui.model.odata.v4.Context}     oBindingContext    Context of current object (unused)
         * @param {sap.ui.model.odata.v4.Context[]}   aSelectedContexts  The selected MaintenanceTask contexts
         * @param {object}                            oExtensionAPI      FE extension API (for refresh)
         */
        onPressTest: function (oBindingContext, aSelectedContexts, oExtensionAPI) {
            // Ensure there are selected tasks
            if (!Array.isArray(aSelectedContexts) || aSelectedContexts.length === 0) {
                MessageBox.error("No tasks selected.");
                return;
            }

            // Determine which actions are applicable based on current Status values
            const uniqueStatuses = new Set(
                aSelectedContexts.map(ctx => ctx.getObject().Status)
            );
            const aStatusOptions = [
                { key: "reopenTask",    text: "Reopen",       enabled: uniqueStatuses.has("DONE") },
                { key: "startProgress", text: "In Progress",  enabled: uniqueStatuses.has("OPEN") },
                { key: "closeTask",     text: "Done",         enabled: uniqueStatuses.has("OPEN") || uniqueStatuses.has("IN_PROGRESS") }
            ];

            // Create the Select control
            const oSelect = new Select("statusSelect", {
                items: aStatusOptions.map(opt =>
                    new Item({ key: opt.key, text: opt.text, enabled: opt.enabled })
                )
            });

            // Build and open the Dialog
            const oDialog = new Dialog({
                title: "Change Task Status",
                content: [
                    new SimpleForm({
                        content: [
                            new Label({ text: "New Status", required: true }),
                            oSelect
                        ]
                    })
                ],
                beginButton: new Button({
                    text: "Confirm",
                    type: "Emphasized",
                    press: async function () {
                        const sActionKey = sap.ui.getCore()
                            .byId("statusSelect")
                            .getSelectedKey();

                        if (!sActionKey) {
                            MessageBox.error("Please select a status from the dropdown.");
                            return;
                        }

                        oDialog.close();

                        // Use the EDMX namespace from your metadata
                        const sNamespace = "com.sap.gateway.srvd.zsd_equip_maintenace_task_jc.v0001";
                        const sQualifiedAction = `${sNamespace}.${sActionKey}`;

                        let iSuccess = 0;
                        for (const oContext of aSelectedContexts) {
                            try {
                                // Create operation binding for bound action
                                const oModel = oContext.getModel();
                                const oOperationBinding = oModel.bindContext(
                                    `${sQualifiedAction}(...)`,
                                    oContext
                                );
                                
                                // Execute the operation
                                await oOperationBinding.invoke();
                                iSuccess++;
                                
                            } catch (oError) {
                                console.error("Action execution failed:", oError);
                                MessageBox.error(`Failed to update task: ${oError.message || oError}`);
                                return;
                            }
                        }

                        if (iSuccess > 0) {
                            MessageToast.show(`${iSuccess} task(s) updated successfully.`);
                            // Refresh the Maintenance Tasks table or fallback to full refresh
                            try {
                                oExtensionAPI.byId("fe::table::_MaintTasks::LineItem")
                                    .getBinding("items")
                                    .refresh();
                            } catch (e) {
                                oExtensionAPI.refresh();
                            }
                        }
                    }
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: () => oDialog.close()
                }),
                afterClose: () => oDialog.destroy()
            });

            oDialog.open();
        }
    };
});