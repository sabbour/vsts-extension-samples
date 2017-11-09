import { ChartComponent } from '../components/ChartComponent';
import { AnalyticsWidgetSettings, WidgetSettings, areSettingsValid } from '../common/WidgetSettings';

import * as Q from 'q';
import * as React from 'react';

import { QueryExpand, WorkItemQueryResult, QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import { Props, State, ComponentBase, ActionsBase, ActionCreator } from "../components/FluxTypes";

import { CommonChartOptions } from "Charts/Contracts";
import { ChartsService } from "Charts/Services";

import { Store } from "VSS/Flux/Store";
import { BurndownResultsQuery, BurndownQueryOptions, GroupedWorkItemAggregation } from "../data/ViewQueries";
import { DatesQuery } from "../data/CommonQueries";
import { CacheableQueryService } from "../data/CacheableQueryService";
import { getService } from "VSS/Service";
import { ViewSize, QueryViewProps, QueryViewState, WidgetMessageType } from "./AnalyticsViewContracts";
import { ChartOptionFactory } from "./ChartOptionFactory";


export class AnalyticsViewActionCreator extends ActionCreator<QueryViewState>{
    private configuration: AnalyticsWidgetSettings;
    private results: QueryViewState;
    private size: ViewSize;
    private suppressAnimation: boolean;

    constructor(actions: ActionsBase, configuration: AnalyticsWidgetSettings, size: ViewSize, suppressAnimation: boolean) {
        super(actions);
        this.setInitialState(configuration, suppressAnimation);
        this.size = size;
    }

    public getInitialState(): QueryViewState {
        return this.results;
    }

    public requestData(): IPromise<QueryViewState> {
        let context = VSS.getWebContext();    
        this.results.isLoading = true;    

        if (!areSettingsValid(this.configuration)) {
            return this.packErrorMessage("This widget is not properly configured yet.");
        }

        let querySettings = {
            projectId: this.configuration.projectId,
            teamId: this.configuration.teamId,
            workItemType: this.configuration.workItemType,
            fields: this.configuration.fields,
        } as BurndownQueryOptions;

        return getService(CacheableQueryService).getCacheableQueryResult(new DatesQuery()).then(dates => {
            return getService(CacheableQueryService).getCacheableQueryResult(new BurndownResultsQuery(querySettings)).then(groupedWorkItemAggregation => {
                if (groupedWorkItemAggregation.length > 0) {
                    this.results.chartState = new ChartOptionFactory().generateChart(this.size, groupedWorkItemAggregation, dates, this.suppressAnimation)
                } else {
                    this.results.statusMessage = "0 results were found for this query.";
                    this.results.messageType = WidgetMessageType.Warning;
                }
                this.results.isLoading = false;
                return this.results;
            });
        });
    }

    private packErrorMessage(error: string): IPromise<QueryViewState> {
        this.results = {
            isLoading: false,
            statusMessage: error,
            chartState: null
        };
        return Q(this.results) as IPromise<QueryViewState>;
    }

    public getConfiguration() {
        return this.configuration;
    }

    public setInitialState(configuration: AnalyticsWidgetSettings, suppressAnimation: boolean) {
        //Establish initial state;
        this.configuration = configuration;
        this.suppressAnimation = suppressAnimation;
        this.results = {
            isLoading: true,
            statusMessage: null
        } as QueryViewState;
    }
}
