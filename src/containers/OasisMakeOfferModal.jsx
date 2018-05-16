import React, { PureComponent } from "react";
import { PropTypes } from "prop-types";

// import ImmutablePropTypes from 'react-immutable-proptypes';
import ReactModal from "react-modal";

import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { MAKE_BUY_OFFER, MAKE_SELL_OFFER } from "../constants";
import offerMakesReducer from "../store/reducers/offerMakes";
import offerMakes from "../store/selectors/offerMakes";
import OfferMakeForm from "./OasisOfferMakeForm";
import SetTokenAllowanceTrustWrapper from "./SetTokenAllowanceTrust";
import OasisTokenBalanceSummary from "./OasisTokenBalanceSummary";
import markets from "../store/selectors/markets";
import modalStyles from "../styles/modules/_modal.scss";
import styles from "./OasisMakeOfferModal.scss";
import CSSModules from "react-css-modules";
import OasisButton from "../components/OasisButton";
import OasisOfferSummary from "./OasisOfferSummary";
import {
  TX_OFFER_MAKE,
  TX_STATUS_AWAITING_CONFIRMATION,
  TX_STATUS_AWAITING_USER_ACCEPTANCE,
  TX_STATUS_CONFIRMED,
  TX_STATUS_REJECTED
} from "../store/reducers/transactions";
import OasisTransactionStatusWrapperInfoBox from "./OasisTransactionStatusInfoBox";

const propTypes = PropTypes && {
  isOpen: PropTypes.bool,
  offerMakeType: PropTypes.oneOf([MAKE_SELL_OFFER, MAKE_BUY_OFFER]).isRequired,
  actions: PropTypes.object.isRequired,
  activeMarketAddress: PropTypes.string,
  canMakeOffer: PropTypes.bool,
  buyToken: PropTypes.string,
  sellToken: PropTypes.string
};

const getOfferTitle = offerMakeType => {
  switch (offerMakeType) {
    case MAKE_BUY_OFFER:
      return "Buy offer";
    case MAKE_SELL_OFFER:
      return "Sell offer";
  }
};

const getBtnColor = offerMakeType => {
  switch (offerMakeType) {
    case MAKE_BUY_OFFER:
      return "success";
    case MAKE_SELL_OFFER:
      return "danger";
  }
};

export class OasisMakeOfferModalWrapper extends PureComponent {
  static makeOfferBtnLabel(offerMakeType, tokenName) {
    switch (offerMakeType) {
      case MAKE_SELL_OFFER:
        return `Sell ${tokenName}`;
      case MAKE_BUY_OFFER:
        return `Buy ${tokenName}`;
    }
  }

  constructor(props) {
    super(props);
    this.state = {};
    this.onBuyOffer = this.onBuyOffer.bind(this);
    this.onCancel = this.onCancel.bind(this);
  }

  onCancel() {
    this.props.actions.setOfferMakeModalClosed(this.props.offerMakeType);
  }

  async onBuyOffer() {
    this.setState(
      {
        disableOfferMakeButton: true,
        txStatus: false,
        txStartTimestamp: undefined
      },
      () =>
        this.props.actions.makeOffer(this.props.offerMakeType, {
          onStart: this.onTransactionStart.bind(this),
          onCancelCleanup: this.onTransactionCancelledByUser.bind(this),
          onPending: this.onTransactionPending.bind(this),
          onCompleted: this.onTransactionCompleted.bind(this),
          onRejected: this.onTransactionRejected.bind(this)
        })
    );
  }

  onTransactionStart() {
    this.setState({
      txStatus: TX_STATUS_AWAITING_USER_ACCEPTANCE,
      disableForm: true,
      lockCancelButton: true
    });
  }

  onTransactionCancelledByUser() {
    this.setState({ disableOfferMakeButton: false });
    this.setState({
      txStatus: undefined,
      disableForm: false,
      lockCancelButton: false
    });
  }
  onTransactionPending({ txStartTimestamp }) {
    this.setState({
      txStatus: TX_STATUS_AWAITING_CONFIRMATION,
      txStartTimestamp
    });
  }

  askForConfirmationBeforeModalClose() {
    const { lockCancelButton } = this.state;
    return lockCancelButton;
  }

  onTransactionCompleted() {
    this.setState({
      txStatus: TX_STATUS_CONFIRMED
    });
  }

  onTransactionRejected({ txHash }) {
    this.setState({
      txStatus: TX_STATUS_REJECTED,
      txHash,
      disableForm: true,
      lockCancelButton: false,
      disableOfferMakeButton: false
    });
  }

  renderTransactionStatus() {
    const { txStartTimestamp, txStatus } = this.state;
    return <OasisTransactionStatusWrapperInfoBox
      txStatus={txStatus}
      infoText={<strong>Process order</strong>}
      txTimestamp={txStartTimestamp}
      localStatus={txStatus}
      txType={TX_OFFER_MAKE}
    />;
  }

  isOfferMakeCompleted() {
    return this.state.txStatus;
  }

  render() {
    const {
      baseToken,
      quoteToken,
      offerMakeType,
      canMakeOffer,
      marketAddress,
      sellToken,
      form,
      actions: { getTransactionGasCostEstimate }
    } = this.props;

    return (
      <ReactModal
        ariaHideApp={false}
        isOpen={true}
        className={modalStyles.modal}
      >
        <h4 className={styles.heading}>{getOfferTitle(offerMakeType)}</h4>
        <button className={modalStyles.closeModalBtn} onClick={this.onCancel}>
          ×
        </button>
        <OasisTokenBalanceSummary summary="Available" token={sellToken} />
        <div>
          <OfferMakeForm
            baseToken={baseToken}
            quoteToken={quoteToken}
            offerMakeType={offerMakeType}
            form={form}
            disableForm={this.state.disableForm}
          />

          <OasisOfferSummary
            disableBalanceWarning={this.isOfferMakeCompleted()}
            offerType={offerMakeType} />
          {this.renderTransactionStatus()}
          <SetTokenAllowanceTrustWrapper
            onTransactionPending={() =>
              this.setState({ lockCancelButton: true })
            }
            onTransactionCompleted={newAllowanceStatus => {
              newAllowanceStatus && getTransactionGasCostEstimate(offerMakeType);
              this.setState({
                lockCancelButton: false
              });
            }}
            onCancelCleanup={() =>
              this.setState({
                lockCancelButton: false
              })
            }
            allowanceSubjectAddress={marketAddress}
            tokenName={sellToken}
          />
          <div className={styles.footer}>
            <OasisButton onClick={this.onCancel}>
              {this.askForConfirmationBeforeModalClose() ? "Close" : "Cancel"}
            </OasisButton>
            <OasisButton
              disabled={!canMakeOffer || this.state.disableOfferMakeButton}
              onClick={this.onBuyOffer}
              color={getBtnColor(offerMakeType)}
            >
              {OasisMakeOfferModalWrapper.makeOfferBtnLabel(
                offerMakeType,
                baseToken
              )}
            </OasisButton>
          </div>
        </div>
      </ReactModal>
    );
  }
}

export function mapStateToProps(state, props) {
  return {
    marketAddress: markets.activeMarketAddress(state),
    canMakeOffer: offerMakes.canMakeOffer(state, props.offerMakeType),
    buyToken: offerMakes.activeOfferMakeBuyToken(state, props.form),
    sellToken: offerMakes.activeOfferMakeSellToken(state, props.form)
  };
}

export function mapDispatchToProps(dispatch) {
  const actions = {
    setOfferMakeModalClosed:
      offerMakesReducer.actions.setOfferMakeModalClosedEpic,
    makeOffer: offerMakesReducer.actions.makeOfferEpic,
    getTransactionGasCostEstimate: offerMakesReducer.actions.updateTransactionGasCostEstimateEpic
  };
  return { actions: bindActionCreators(actions, dispatch) };
}

OasisMakeOfferModalWrapper.propTypes = propTypes;
OasisMakeOfferModalWrapper.displayName = "OasisMakeOfferModal";
export default connect(mapStateToProps, mapDispatchToProps)(
  CSSModules(
    OasisMakeOfferModalWrapper,
    { modalStyles, styles },
    { allowMultiple: true }
  )
);
