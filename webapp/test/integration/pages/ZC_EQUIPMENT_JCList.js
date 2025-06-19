sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'coafiorielements',
            componentId: 'ZC_EQUIPMENT_JCList',
            contextPath: '/ZC_EQUIPMENT_JC'
        },
        CustomPageDefinitions
    );
});