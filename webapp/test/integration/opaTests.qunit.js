sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'coafiorielements/test/integration/FirstJourney',
		'coafiorielements/test/integration/pages/ZC_EQUIPMENT_JCList',
		'coafiorielements/test/integration/pages/ZC_EQUIPMENT_JCObjectPage',
		'coafiorielements/test/integration/pages/ZC_MAINTENANCE_TASK_JCObjectPage'
    ],
    function(JourneyRunner, opaJourney, ZC_EQUIPMENT_JCList, ZC_EQUIPMENT_JCObjectPage, ZC_MAINTENANCE_TASK_JCObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('coafiorielements') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheZC_EQUIPMENT_JCList: ZC_EQUIPMENT_JCList,
					onTheZC_EQUIPMENT_JCObjectPage: ZC_EQUIPMENT_JCObjectPage,
					onTheZC_MAINTENANCE_TASK_JCObjectPage: ZC_MAINTENANCE_TASK_JCObjectPage
                }
            },
            opaJourney.run
        );
    }
);