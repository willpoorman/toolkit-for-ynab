import { Feature } from 'toolkit/extension/features/feature';
import { isCurrentRouteAccountsPage } from 'toolkit/extension/utils/ynab';
import { controllerLookup } from 'toolkit/extension/utils/ember';
import { getEntityManager } from 'toolkit/extension/utils/ynab';
const YNAB_ACCOUNTS_HEADER_RIGHT = '.accounts-header-balances-right';
const TK_LAST_RECONCILED_ID = 'tk-last-reconciled-date';
const TK_DAYS_SINCE_RECONCILED_ID = 'tk-days-since-reconciled';

export class LastReconciledDate extends Feature {
  injectCSS() {
    return require('./styles.css');
  }

  shouldInvoke() {
    let { selectedAccountId } = controllerLookup('accounts');
    return selectedAccountId && isCurrentRouteAccountsPage();
  }

  invoke() {
    // Get the current account id and calculate the last reconciled date
    let { selectedAccountId } = controllerLookup('accounts');
    let latestDate = this._calculateLastReconciledDate(selectedAccountId);

    // Handle days since reconciled
    if (this.settings.enabled.includes('days-since')) {
      let daysSinceTextToShow = 'NA days';

      // Get the current account id and calculate the last reconciled date
      if (latestDate) {
        let todaysDate = moment();
        let differenceInDays = todaysDate.diff(latestDate, 'days');
        daysSinceTextToShow = differenceInDays + ' days';
      }

      // Retrieve or create the days since reconciled container
      let daysSinceContainer = $(`#${TK_DAYS_SINCE_RECONCILED_ID}`);
      if (!daysSinceContainer || daysSinceContainer.length === 0) {
        $(YNAB_ACCOUNTS_HEADER_RIGHT).append(
          `<div class="tk-accounts-header-days-since-reconciled">
          <span id="${TK_DAYS_SINCE_RECONCILED_ID}">${daysSinceTextToShow}</span>
          <div class="tk-accounts-header-days-since-reconciled-label">Since Last Reconciled</div>
        </div>`
        );
      }

      // Update the days sinces reconciled in the element
      daysSinceContainer.text(daysSinceTextToShow);
      this._setFeatureVisibility('.tk-accounts-header-days-since-reconciled', true);
    }

    // Handle date last reconciled
    if (this.settings.enabled.includes('last-date')) {
      let latestDateTextToShow = 'NA';
      if (latestDate) {
        latestDateTextToShow = ynab.YNABSharedLib.dateFormatter.formatDateExpanded(
          latestDate.utc()
        );
      }

      // Retrieve or create the reconcile date container
      let dateContainer = $(`#${TK_LAST_RECONCILED_ID}`);
      if (!dateContainer || dateContainer.length === 0) {
        $(YNAB_ACCOUNTS_HEADER_RIGHT).append(
          `<div class="tk-accounts-header-last-reconciled">
          <span id="${TK_LAST_RECONCILED_ID}">${latestDateTextToShow}</span>
          <div class="tk-accounts-header-last-reconciled-label">Last Reconciled Date</div>
        </div>`
        );
      }

      // Update the reconcile date in the element
      dateContainer.text(latestDateTextToShow);
      this._setFeatureVisibility($('.tk-accounts-header-last-reconciled'), true);
    }
  }

  onRouteChanged() {
    if (this.shouldInvoke()) {
      this.invoke();
    } else {
      this._setFeatureVisibility('.tk-accounts-header-last-reconciled', false);
      this._setFeatureVisibility('.tk-accounts-header-days-since-reconciled', false);
    }
  }

  observe(changedNodes) {
    if (!this.shouldInvoke()) return;

    // When the reconciled icon changes, reevaluate our date
    if (changedNodes.has('is-reconciled-icon svg-icon lock')) {
      this.invoke();
    }
  }

  /**
   * Calculate the last reconciled date
   * @param {String} accountId The account id to get the reconciled date for
   * @returns {Moment} the latest date, null otherwise
   */
  _calculateLastReconciledDate = accountId => {
    const account = getEntityManager().getAccountById(accountId);

    let reconciledDates = account
      .getTransactions()
      .filter(transaction => transaction.date && transaction.isReconciled())
      .map(transaction => moment(transaction.date.getUTCTime()));

    return reconciledDates.length ? moment.max(reconciledDates) : null;
  };

  /**
   * Helper methods to show and hide the reconcile containers
   * @param {Container} featureContainer container to hide or show
   * @param {Boolean} visible True to show the container, false to hide
   */
  _setFeatureVisibility = (featureSelector, visible) => {
    let featureContainer = $(featureSelector);
    if (featureContainer && featureContainer.length) {
      featureContainer.toggle(visible);
    }
  };
}