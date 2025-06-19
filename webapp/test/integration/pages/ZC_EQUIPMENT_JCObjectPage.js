sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'coafiorielements',
            componentId: 'ZC_EQUIPMENT_JCObjectPage',
            contextPath: '/ZC_EQUIPMENT_JC'
        },
        CustomPageDefinitions
    );
});