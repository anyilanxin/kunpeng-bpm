/**
 * P1 验证样例：覆盖全部 DRG 形状（Decision/BKM/InputData/KS/注记）、
 * 三类需求连线（信息/知识/授权——含 Decision→Decision 信息需求）与关联、
 * kunpeng 扩展属性（versionTag/historyTimeToLive）。
 * 命名空间为 DMN 1.3 交换域（dmn-moddle@12 描述符域）。
 */
export const sampleDmn = `<?xml version="1.0" encoding="UTF-8"?>
<dmn:definitions xmlns:dmn="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/" xmlns:kunpeng="http://anyilanxin.com/schema/dmn/1.0" id="Definitions_1" name="信贷评审决策模型" namespace="http://anyilanxin.com/schema/dmn">
  <dmn:inputData id="InputData_1" name="申请人年龄"/>
  <dmn:inputData id="InputData_2" name="信用分"/>
  <dmn:decision id="Decision_1" name="风险评级" kunpeng:versionTag="v1.2" kunpeng:historyTimeToLive="30">
    <dmn:variable name="风险等级" typeRef="string"/>
    <dmn:informationRequirement id="InfoReq_1">
      <dmn:requiredInput href="#InputData_1"/>
    </dmn:informationRequirement>
    <dmn:informationRequirement id="InfoReq_2">
      <dmn:requiredInput href="#InputData_2"/>
    </dmn:informationRequirement>
    <dmn:knowledgeRequirement id="KnowReq_1">
      <dmn:requiredKnowledge href="#BusinessKnowledgeModel_1"/>
    </dmn:knowledgeRequirement>
    <dmn:authorityRequirement id="AuthReq_1">
      <dmn:requiredAuthority href="#KnowledgeSource_1"/>
    </dmn:authorityRequirement>
    <dmn:decisionTable id="DecisionTable_1" hitPolicy="UNIQUE">
      <dmn:input id="Input_1">
        <dmn:inputExpression id="LiteralExpr_1" typeRef="string">
          <dmn:text>申请人年龄</dmn:text>
        </dmn:inputExpression>
      </dmn:input>
      <dmn:input id="Input_2">
        <dmn:inputExpression id="LiteralExpr_2" typeRef="integer">
          <dmn:text>信用分</dmn:text>
        </dmn:inputExpression>
      </dmn:input>
      <dmn:output id="Output_1" name="风险等级" typeRef="string"/>
      <dmn:annotation name="备注"/>
      <dmn:rule id="Rule_1">
        <dmn:inputEntry id="Unary_1">
          <dmn:text>&lt; 30</dmn:text>
        </dmn:inputEntry>
        <dmn:inputEntry id="Unary_2">
          <dmn:text>&gt;= 700</dmn:text>
        </dmn:inputEntry>
        <dmn:outputEntry id="LitExpr_3">
          <dmn:text>"低风险"</dmn:text>
        </dmn:outputEntry>
        <dmn:annotationEntry>
          <dmn:text>年轻高分客群</dmn:text>
        </dmn:annotationEntry>
      </dmn:rule>
      <dmn:rule id="Rule_2">
        <dmn:inputEntry id="Unary_3">
          <dmn:text>&lt; 30</dmn:text>
        </dmn:inputEntry>
        <dmn:inputEntry id="Unary_4">
          <dmn:text>&lt; 700</dmn:text>
        </dmn:inputEntry>
        <dmn:outputEntry id="LitExpr_4">
          <dmn:text>"中风险"</dmn:text>
        </dmn:outputEntry>
        <dmn:annotationEntry>
          <dmn:text>人工复核</dmn:text>
        </dmn:annotationEntry>
      </dmn:rule>
      <dmn:rule id="Rule_3">
        <dmn:inputEntry id="Unary_5">
          <dmn:text>&gt;= 30</dmn:text>
        </dmn:inputEntry>
        <dmn:inputEntry id="Unary_6"/>
        <dmn:outputEntry id="LitExpr_5">
          <dmn:text>"待评估"</dmn:text>
        </dmn:outputEntry>
        <dmn:annotationEntry/>
      </dmn:rule>
    </dmn:decisionTable>
  </dmn:decision>
  <dmn:decision id="Decision_2" name="授信额度">
    <dmn:informationRequirement id="InfoReq_3">
      <dmn:requiredDecision href="#Decision_1"/>
    </dmn:informationRequirement>
  </dmn:decision>
  <dmn:businessKnowledgeModel id="BusinessKnowledgeModel_1" name="评级规则库">
    <dmn:encapsulatedLogic id="EncLogic_1">
      <dmn:formalParameter id="Param_1" name="信用分" typeRef="integer"/>
      <dmn:formalParameter id="Param_2" name="年龄" typeRef="integer"/>
      <dmn:literalExpression id="EncBody_1">
        <dmn:text>信用分 * 0.7 + 年龄 * 0.3</dmn:text>
      </dmn:literalExpression>
    </dmn:encapsulatedLogic>
  </dmn:businessKnowledgeModel>
  <dmn:knowledgeSource id="KnowledgeSource_1" name="风控政策文件"/>
  <dmn:association id="Association_1">
    <dmn:sourceRef href="#Decision_1"/>
    <dmn:targetRef href="#TextAnnotation_1"/>
  </dmn:association>
  <dmn:textAnnotation id="TextAnnotation_1">
    <dmn:text>评级规则每年复审一次</dmn:text>
  </dmn:textAnnotation>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="DMNDiagram_1">
      <dmndi:DMNShape id="Shape_Input1" dmnElementRef="InputData_1">
        <dc:Bounds x="120" y="80" width="170" height="50"/>
      </dmndi:DMNShape>
      <dmndi:DMNShape id="Shape_Input2" dmnElementRef="InputData_2">
        <dc:Bounds x="120" y="200" width="170" height="50"/>
      </dmndi:DMNShape>
      <dmndi:DMNShape id="Shape_Decision1" dmnElementRef="Decision_1">
        <dc:Bounds x="440" y="120" width="150" height="70"/>
      </dmndi:DMNShape>
      <dmndi:DMNShape id="Shape_Decision2" dmnElementRef="Decision_2">
        <dc:Bounds x="440" y="290" width="150" height="70"/>
      </dmndi:DMNShape>
      <dmndi:DMNShape id="Shape_BKM1" dmnElementRef="BusinessKnowledgeModel_1">
        <dc:Bounds x="740" y="60" width="160" height="80"/>
      </dmndi:DMNShape>
      <dmndi:DMNShape id="Shape_KS1" dmnElementRef="KnowledgeSource_1">
        <dc:Bounds x="740" y="220" width="130" height="80"/>
      </dmndi:DMNShape>
      <dmndi:DMNShape id="Shape_Note1" dmnElementRef="TextAnnotation_1">
        <dc:Bounds x="140" y="400" width="140" height="70"/>
      </dmndi:DMNShape>
      <dmndi:DMNEdge id="Edge_InfoReq1" dmnElementRef="InfoReq_1">
        <di:waypoint x="290" y="105"/>
        <di:waypoint x="440" y="150"/>
      </dmndi:DMNEdge>
      <dmndi:DMNEdge id="Edge_InfoReq2" dmnElementRef="InfoReq_2">
        <di:waypoint x="290" y="225"/>
        <di:waypoint x="440" y="175"/>
      </dmndi:DMNEdge>
      <dmndi:DMNEdge id="Edge_InfoReq3" dmnElementRef="InfoReq_3">
        <di:waypoint x="515" y="190"/>
        <di:waypoint x="515" y="290"/>
      </dmndi:DMNEdge>
      <dmndi:DMNEdge id="Edge_KnowReq1" dmnElementRef="KnowReq_1">
        <di:waypoint x="740" y="100"/>
        <di:waypoint x="590" y="140"/>
      </dmndi:DMNEdge>
      <dmndi:DMNEdge id="Edge_AuthReq1" dmnElementRef="AuthReq_1">
        <di:waypoint x="740" y="260"/>
        <di:waypoint x="590" y="180"/>
      </dmndi:DMNEdge>
      <dmndi:DMNEdge id="Edge_Assoc1" dmnElementRef="Association_1">
        <di:waypoint x="440" y="185"/>
        <di:waypoint x="280" y="400"/>
      </dmndi:DMNEdge>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</dmn:definitions>`;
