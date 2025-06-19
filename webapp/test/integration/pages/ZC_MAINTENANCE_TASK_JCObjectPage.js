sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'coafiorielements',
            componentId: 'ZC_MAINTENANCE_TASK_JCObjectPage',
            contextPath: '/ZC_EQUIPMENT_JC/_MaintenanceTasks'
        },
        CustomPageDefinitions
    );
});