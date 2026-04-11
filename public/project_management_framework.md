# Cognitive Project Management for AI (CPMAI) Framework

This document serves as the master requirement source for the agency's iterative project management hub. It contains the exact workbook questions from the CPMAI framework PDF (Pages 65-91).

---

## Phase I: Business Understanding
*This phase focuses on defining the business problem, success criteria, and operational constraints.*

### 🛠️ Workbook Artifacts (Questions)

1.  **Business Problem Statement**: What problem are you solving with AI in this iteration?
2.  **Success Criteria (Measures of Success)**: What are the objective measures of success for this project iteration?
3.  **Project Resources & Budget**: What is the cost and time budget for this project?
4.  **ROI Analysis**: What is the expected ROI for this project?
5.  **Cognitive Decision Rationale**: Why does this project need a cognitive (AI) solution?
6.  **Noncognitive Alternatives**: (What noncognitive (non-AI) alternatives are there to solving the current business problem? For those alternatives, why are they not feasible for this project? If noncognitive alternatives are feasible, then why are they not being used for this project?)
7.  **Hybrid Scope**: What are the noncognitive (non-AI) portions of this project that will be used in conjunction with the cognitive components?
8.  **Non-Cognitive Automation Possible?**: (Are non-cognitive automation alternatives possible for this iteration? If so, why are they not being used for this project iteration?)
9.  **Cognitive Project Objectives**: What are the cognitive objectives for this project?
10. **Cognitive Outcomes & Goals**: What are the cognitive outcomes and goals for this project?
11. **AI Value Proposition**: (What would the AI project need to successfully do that a non-AI project would not be able to do? In what ways would the AI system need to be better than a non-AI system?)
12. **AI Patterns Selected**: Which pattern(s) of AI are you implementing for this project iteration?
13. **Schedule Requirements & Constraints**: What are the project iteration schedule requirements or constraints?
14. **Technology Resources**: What technology resources do you need for this project?
15. **Skills Inventory**: What skills do you need for this project iteration?
16. **Talent/Team Resources**: What talent/team resources do you need for this project?
17. **General Deliverability Constraints**: What are the other project constraints that might impact the ability to deliver this iteration?
18. **Model Performance Metrics & Sensitivity**: (What are the desired or required performance metrics for the model? What sensitivities are there to false positives or negatives in the case of a binary classifier or inaccurate responses in the case of generative AI solutions?)
19. **Business KPI Performance Metrics**: What are the desired or required business KPI performance metrics for this AI project iteration?
20. **Technology KPI Performance Metrics**: What are the desired or required technology KPI performance metrics for this AI project iteration?
21. **Trustworthy AI Framework Selection**: (What, if any, trustworthy AI framework will you be using for this project? If none, how will you ensure consistent application of trustworthy AI across this project and others?)
22. **Risk and Harm Evaluation**: (What potential physical, financial, emotional, environmental, or other harms could be caused by this project? What approaches will you use to mitigate those potential harms?)
23. **Failure Mode Analysis & Handling**: (How will you know when the AI project is failing to provide adequate results? How will you handle AI system failures for this iteration?)
24. **Failure Risks**: What do you see as the most significant risks for this project that could lead to project failure?
25. **Human-in-the-Loop (HITL) Strategy**: How will you maintain a human in the loop or otherwise involved in the AI project operation?
26. **Informational Bias Management**: How will you identify and minimize exposure to informational bias?
27. **Legal, Regulatory, and Compliance Protocols**: For this AI project iteration, what laws, regulations, or other compliance may be required? If you do not know, how will you find out?
28. **Data Source Transparency**: What transparency are you going to provide to others about the source(s) of the data used in this AI project?
29. **Data Selection & Filter Transparency**: What transparency are you going to provide to others about the methods you use to select and filter the data you are using for your AI project?
30. **Explainability Requirements**: What are the requirements for explainable algorithms for this AI project?

### 🚦 Phase I Go/No-Go Decision Gates

31. **Objective Clarity [Go/No-Go]**: (Do you have a clear description of the problem with regard to the business objectives? If so, mark this a “GO.” If not, what additional definition is required? Mark this as a “No-Go.”)
32. **Customer Strategy Willingness [Go/No-Go]**: (Is the customer/business owner/product owner willing to implement/put in production the cognitive solution that your team will be producing? If so, mark this as “Go.” If not, what obstacles are in the way of implementing your AI project? Mark this as a “No-Go.”)
33. **ROI Viability [Go/No-Go]**: (Does the cognitive solution provide enough ROI or impact? If so, mark this as “Go.” If not, what do you need to modify in your project to provide a positive return? Mark this as a “No-Go.”)
34. **Data Availability Check [Go/No-Go]**: (Is the data required to create the cognitive model available, and does it actually measure what you need? If so, mark this as “Go.” If not, what data do you need? Mark this as a “No-Go.”)
35. **Data Access Check [Go/No-Go]**: (Do you have access to the data you need? If so, mark this as “Go. If not, what do you need for access to the data? Mark this as a “No-Go.”)
36. **Data Quality Guess [Go/No-Go]**: (Does the data have a sufficient level of quality to be useful? If so, mark this as “Go.” If not, mark as a “No-Go.” We will revisit this during Phase II.)
37. **Technology & Expertise Access [Go/No-Go]**: (Do you have access to the technology and expertise you need for this iteration? If so, mark this as “Go.” If not, what technology or expertise do you need? Mark as a “No-Go.”)
38. **Implementation Feasibility [Go/No-Go]**: (Is it feasible to implement the model where and how you want to? If so, mark this as “Go.” If not, how can you obtain the answers needed to make it feasible? Mark as a “No-Go.”)
39. **Technical/Operational/Financial Sense [Go/No-Go]**: (Does it make technical, operational, business, and financial sense to implement the model in the way and in the location you want to? If so, mark this as “Go.” If not, how can you get the answers needed to make it feasible? Mark as a “No-Go.”)

---

## Phase II: Data Understanding
*This phase focuses on identifying, collecting, and verifying the quality of data.*

### 🛠️ Workbook Artifacts (Questions)

1.  **Data Inventory & Locations**: (Detail the list of data and locations of that data you will need for this iteration of the AI project. If you are encountering any issues with locating or accessing data, document resolution to these issues.)
2.  **Nature and Structure of Data**: (Document the nature of the data you need. What structure is it? Does it have the elements that you need for your AI project iteration? If not, how will you resolve issues of mismatch with the data you need and what you have?)
3.  **Data Inspection Discovery**: (Have you inspected and selected some of the data to ensure it meets your needs? Detail what you discovered. Is the data a sufficient quantity for your AI project iteration needs? If not, how will you resolve the lack of data?)
4.  **Data Quality Audit & Preparation Pipeline**: (What is the current quality of the data you located for your AI project? What needs do you have for data preparation, augmentation, enhancement, and transformation?)
5.  **Training Data Requirement Splits**: (What additional, specific needs do you have for training data for your AI project? How will you make sure you have sufficient training, test, and validation data?)
6.  **Edge Device Specific Requirements**: Do you have special needs for data to or from edge devices? If so, detail those needs here.
7.  **Foundation and Pre-Trained Models Analysis**: (Can you make use of any pretrained models, models from third parties, or foundation models? If so, detail those models and where and how you will access them. If you need to extend the models through transfer learning or fine-tuning, detail those needs here.)

---

## Phase III: Data Preparation
*This phase focuses on building the prepared dataset and feature engineering.*

### 🛠️ Workbook Artifacts (Questions)

1.  **Data Selection Method and Exclusions**: (Select the data that is needed for the project and provide some documentation of the data selection method. If data sources or data within a data source was excluded, detail that exclusion for future reference.)
2.  **Data-Cleansing and Preparation Operations**: (Perform data-cleansing and preparation operations. Detail the methods used for preparation. Document the data pipeline used, from data collection and ingestion through data preparation.)
3.  **Data Augmentation and Enhancement Log**: (Perform data augmentation and enhancement operations. Detail the methods used for augmentation. Document additions or modifications to the data pipeline for augmentation.)
4.  **Data Labeling Strategy and Costs**: (Perform data labeling as necessary for data. Detail method and approach used for data labeling and how the costs will scale as data-labeling needs increase. Document additions or modifications to the data pipeline for data labeling.)

---

## Phase IV: Model Development
*This phase focuses on algorithm selection, foundation model tuning, and training results.*

### 🛠️ Workbook Artifacts (Questions)

1.  **Algorithm Selection**: (Select the appropriate algorithm and approach to be used for model development. If a generative AI, foundation model, or pretrained model will be used, see a later workbook task.)
2.  **Model Ensemble Configuration**: (If an ensemble of models will be developed for this iteration, detail the configuration of that ensemble.)
3.  **AutoML Application Strategy**: (If you will use AutoML tools to accelerate model development, detail the tool(s) used and how they will be applied for this AI project iteration.)
4.  **Pretrained/Foundation Model Fine-Tuning**: (If a pretrained model or foundation model will be used, detail which model(s) will be used and the method, if any, used to fine-tune the model for your specific AI project iteration.)
5.  **Generative AI Approach and API Costs**: (If needed, detail which generative AI approach will be used; if hosted through an API, detail the costs and limitations of the API.)
6.  **Prompt Engineering Strategy**: (Determine the approach for prompt engineering to be used with the generative AI solution.)
7.  **LLM Chaining Logic**: (Determine the approach used, if any, to chain LLM or generative AI results to be used with additional resources or data sources of pre- or post-processing of generative AI/LLM results.)
8.  **Validation and Fit Logic**: (Determine the approach used to validate the model and ensure that it does not overfit or underfit data and achieves desired machine learning objectives.)
9.  **Model Training/Development Results**: (Perform model training/model development, fine-tuning, or prompt engineering activities. Document or detail any results or outputs that can be shared for future phases or iterations.)
10. **Hyperparameter Optimization & Measurements**: (Document measurements of model fit against training, test, and validation data. Determine methods for hyperparameter optimization and perform optimization, documenting results.)

---

## Phase V: Model Evaluation
*This phase focuses on model performance audit against business/tech KPIs and approvals.*

### 🛠️ Workbook Artifacts (Questions)

1.  **Model Performance Audit**: (Evaluate the model and produce evaluation measures including, as relevant, confusion matrices, ROC curves, and other assessments of model performance.)
2.  **Business KPI Verification**: (Measure model performance against the business KPIs detailed in Phase I. If the model does not perform adequately, detail the steps needed to improve the KPI performance of the model in this iteration.)
3.  **Technology KPI Verification**: (Measure model performance against the technology KPIs detailed in Phase I. If the model does not perform adequately, detail the steps needed to improve the KPI performance of the model in this iteration.)
4.  **Iterative Improvement Approach**: (Detail approach that will be used to iterate this model to improve on any of the results in this phase. If any iteration is required to previous phases to improve the results, detail what previous phases need iteration.)
5.  **Operational Approvals & Reviews**: (Detail any required approvals or reviews to be conducted before the model can be operationalized in production.)

---

## Phase VI: Operationalization
*This phase focuses on deployment modes, continuous monitoring, governance, and post-mortem review.*

### 🛠️ Workbook Artifacts (Questions)

1.  **Deployment Mode and Location**: (How will this model be operationalized, and in what mode and location(s)?)
2.  **IT Operationalization Processes**: (What IT processes must be followed to operationalize the model as planned?)
3.  **Hybrid Non-Cognitive Activities**: (What additional non-AI/noncognitive activities, such as application development should be done to operationalize this model as intended for this iteration?)
4.  **Continuous Monitoring & Management**: (What continuous monitoring and management approach and tools will be used for the model in this iteration?)
5.  **Governance and Ownership Structure**: (Determine which group(s) will be responsible for governance and ownership of the model for this and future iterations, as well as the means by which the group will respond to various needs after this iteration.)
6.  **Next Iteration Planning & Resources**: (What should be done in the next iteration for this AI project? What resources exist to pursue the next iteration?)
7.  **Iterative Post-Mortem Review**: (Perform an iteration post-mortem. What went well during this iteration? What did not go well? What can be improved for future AI project iterations?)
