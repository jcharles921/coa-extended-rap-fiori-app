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
                { key: "closeTask",     text: "Done",         enabled: uniqueStatuses.has("OPEN") || uniqueStatuses.has("IN PROGRES") }
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
                        let bHasError = false;

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
                                bHasError = true;
                                MessageBox.error(`Failed to update task: ${oError.message || oError}`);
                                break; // Stop processing if there's an error
                            }
                        }

                        if (iSuccess > 0 && !bHasError) {
                            MessageToast.show(`${iSuccess} task(s) updated successfully.`);
                            
                            // Multiple refresh strategies for RAP applications
                            try {
                                // Method 1: Try to refresh the maintenance tasks table specifically
                                const oMaintenanceTasksTable = oExtensionAPI.byId("fe::table::ZC_MAINTENANCE_TASK_JC::LineItem");
                                if (oMaintenanceTasksTable) {
                                    oMaintenanceTasksTable.getBinding("items").refresh();
                                    console.log("Refreshed maintenance tasks table directly");
                                } else {
                                    throw new Error("Table not found");
                                }
                            } catch (e1) {
                                try {
                                    // Method 2: Try alternative table ID pattern
                                    const oTable = oExtensionAPI.byId("fe::table::_MaintenanceTasks::LineItem");
                                    if (oTable) {
                                        oTable.getBinding("items").refresh();
                                        console.log("Refreshed with alternative table ID");
                                    } else {
                                        throw new Error("Alternative table not found");
                                    }
                                } catch (e2) {
                                    try {
                                        // Method 3: Refresh the page/view
                                        oExtensionAPI.refreshPage();
                                        console.log("Refreshed entire page");
                                    } catch (e3) {
                                        try {
                                            // Method 4: Generic refresh
                                            oExtensionAPI.refresh();
                                            console.log("Generic refresh executed");
                                        } catch (e4) {
                                            // Method 5: Refresh binding contexts
                                            aSelectedContexts.forEach(ctx => {
                                                try {
                                                    ctx.refresh();
                                                } catch (e5) {
                                                    console.warn("Could not refresh context:", e5);
                                                }
                                            });
                                            console.log("Refreshed binding contexts");
                                        }
                                    }
                                }
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