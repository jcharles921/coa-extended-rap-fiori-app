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
        },
 
Workflow: function (oBindingContext, aSelectedContexts, oExtensionAPI) {
    
    if (!Array.isArray(aSelectedContexts) || aSelectedContexts.length === 0) {
        MessageBox.error("No tasks selected.");
        return;
    }

  
    const taskGroups = {
        toReopen: [],    
        toProgress: [], 
        toClose: []      
    };

    // Categorize each selected task based on its current status
    aSelectedContexts.forEach(oContext => {
        const oTask = oContext.getObject();
        const sStatus = oTask.Status;

        switch (sStatus) {
            case "DONE":
                taskGroups.toReopen.push({
                    context: oContext,
                    action: "reopenTask",
                    statusText: "Reopen"
                });
                break;
            case "OPEN":
                taskGroups.toProgress.push({
                    context: oContext,
                    action: "startProgress", 
                    statusText: "Start Progress"
                });
                break;
            case "IN PROGRES":
                taskGroups.toClose.push({
                    context: oContext,
                    action: "closeTask",
                    statusText: "Close"
                });
                break;
            default:
                console.warn(`Unknown status '${sStatus}' for task. Skipping.`);
        }
    });

    // Create summary of actions to be performed
    const aSummary = [];
    if (taskGroups.toReopen.length > 0) {
        aSummary.push(`${taskGroups.toReopen.length} task(s) will be reopened`);
    }
    if (taskGroups.toProgress.length > 0) {
        aSummary.push(`${taskGroups.toProgress.length} task(s) will be set to In Progress`);
    }
    if (taskGroups.toClose.length > 0) {
        aSummary.push(`${taskGroups.toClose.length} task(s) will be closed`);
    }

    if (aSummary.length === 0) {
        MessageBox.information("No actions available for the selected tasks.");
        return;
    }

    // Show confirmation dialog
    const sConfirmationText = `The following actions will be performed:\n\n${aSummary.join('\n')}\n\nDo you want to continue?`;
    
    MessageBox.confirm(sConfirmationText, {
        title: "Confirm Workflow Actions",
        onClose: async function (sAction) {
            if (sAction !== MessageBox.Action.OK) {
                return;
            }

            // Execute all grouped actions
            const sNamespace = "com.sap.gateway.srvd.zsd_equip_maintenace_task_jc.v0001";
            let iTotalSuccess = 0;
            let bHasError = false;
            const aErrors = [];

            // Process each group of tasks
            for (const [groupName, tasks] of Object.entries(taskGroups)) {
                if (tasks.length === 0) continue;

                for (const taskInfo of tasks) {
                    try {
                        const sQualifiedAction = `${sNamespace}.${taskInfo.action}`;
                        const oModel = taskInfo.context.getModel();
                        const oOperationBinding = oModel.bindContext(
                            `${sQualifiedAction}(...)`,
                            taskInfo.context
                        );
                        
                        await oOperationBinding.invoke();
                        iTotalSuccess++;
                        
                    } catch (oError) {
                        console.error(`Action '${taskInfo.action}' failed:`, oError);
                        bHasError = true;
                        aErrors.push(`Failed to ${taskInfo.statusText.toLowerCase()}: ${oError.message || oError}`);
                    }
                }
            }

            // Show results
            if (iTotalSuccess > 0) {
                MessageToast.show(`${iTotalSuccess} task(s) updated successfully.`);
            }

            if (bHasError) {
                const sErrorText = aErrors.length > 3 
                    ? `${aErrors.slice(0, 3).join('\n')}\n... and ${aErrors.length - 3} more errors`
                    : aErrors.join('\n');
                MessageBox.error(`Some operations failed:\n\n${sErrorText}`);
            }

            // Refresh the UI if any operations succeeded
            if (iTotalSuccess > 0) {
                try {
                    // Try multiple refresh strategies (same as in onPressTest)
                    const oMaintenanceTasksTable = oExtensionAPI.byId("fe::table::ZC_MAINTENANCE_TASK_JC::LineItem");
                    if (oMaintenanceTasksTable) {
                        oMaintenanceTasksTable.getBinding("items").refresh();
                        console.log("Refreshed maintenance tasks table directly");
                    } else {
                        throw new Error("Table not found");
                    }
                } catch (e1) {
                    try {
                        const oTable = oExtensionAPI.byId("fe::table::_MaintenanceTasks::LineItem");
                        if (oTable) {
                            oTable.getBinding("items").refresh();
                            console.log("Refreshed with alternative table ID");
                        } else {
                            throw new Error("Alternative table not found");
                        }
                    } catch (e2) {
                        try {
                            oExtensionAPI.refreshPage();
                            console.log("Refreshed entire page");
                        } catch (e3) {
                            try {
                                oExtensionAPI.refresh();
                                console.log("Generic refresh executed");
                            } catch (e4) {
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
    });
}

    };
});