import './styleCompiler/ww-style-page-fab9ca83-7dde-4bd1-b2e1-2a7aab78c558.css';
/*__WW_PAGE_COMPONENT_IMPORTS_START*/
import element_f1b67d54_2716_43a4_a414_ab7f505c2ace from "@weweb-internal/ext-element-f1b67d54-2716-43a4-a414-ab7f505c2ace";

// eslint-disable-next-line no-undef
import element_60676ae5_99b1_4278_9330_4299cd99c5cf from "@weweb-internal/ext-element-60676ae5-99b1-4278-9330-4299cd99c5cf";
import element_b783dc65_d528_4f74_8c14_e27c934c39b1 from "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1";
import element_d7904e9d_fc9a_4d80_9e32_728e097879ad from "@weweb-internal/ext-element-d7904e9d-fc9a-4d80-9e32-728e097879ad";

// eslint-disable-next-line no-undef
import section_99586bd3_2b15_4d6b_a025_6a50d07ca845 from "@weweb-internal/ext-section-99586bd3-2b15-4d6b-a025-6a50d07ca845";

/*__WW_PAGE_COMPONENT_IMPORTS_END__*/

import { registerSsrPageComponents } from '@/_front/rendering/ssrPageComponents';

let isRegistered = false;

export default async function registerPageComponents(app) {
    if (isRegistered) return;

    if (import.meta.env.SSR) {
        await registerSsrPageComponents(
            app,
            // eslint-disable-next-line no-undef
            /*__WW_SSR_PAGE_COMPONENT_DESCRIPTORS_START__*/
[
    {
        "baseId": "f1b67d54-2716-43a4-a414-ab7f505c2ace",
        "importPath": "@weweb-internal/ext-element-f1b67d54-2716-43a4-a414-ab7f505c2ace",
        "name": "wwobject-f1b67d54-2716-43a4-a414-ab7f505c2ace",
        "type": "element"
    },
    {
        "baseId": "60676ae5-99b1-4278-9330-4299cd99c5cf",
        "importPath": "@weweb-internal/ext-element-60676ae5-99b1-4278-9330-4299cd99c5cf",
        "name": "wwobject-60676ae5-99b1-4278-9330-4299cd99c5cf",
        "type": "element"
    },
    {
        "baseId": "b783dc65-d528-4f74-8c14-e27c934c39b1",
        "importPath": "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "name": "wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "type": "element"
    },
    {
        "baseId": "d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "importPath": "@weweb-internal/ext-element-d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "name": "wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "type": "element"
    },
    {
        "baseId": "99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "importPath": "@weweb-internal/ext-section-99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "name": "section-99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "type": "section"
    }
]
/*__WW_SSR_PAGE_COMPONENT_DESCRIPTORS_END__*/
        );
    } else {
        // eslint-disable-next-line no-undef
        app.component("wwobject-f1b67d54-2716-43a4-a414-ab7f505c2ace", element_f1b67d54_2716_43a4_a414_ab7f505c2ace);
        app.component("wwobject-60676ae5-99b1-4278-9330-4299cd99c5cf", element_60676ae5_99b1_4278_9330_4299cd99c5cf);
app.component("wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1", element_b783dc65_d528_4f74_8c14_e27c934c39b1);
app.component("wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad", element_d7904e9d_fc9a_4d80_9e32_728e097879ad);

        // eslint-disable-next-line no-undef
        app.component("section-99586bd3-2b15-4d6b-a025-6a50d07ca845", section_99586bd3_2b15_4d6b_a025_6a50d07ca845);
    }

    isRegistered = true;
}
