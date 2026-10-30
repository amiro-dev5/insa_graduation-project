export type Language = 'en' | 'am' | 'om';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
}

export interface Translations {
  // Navigation & Sidebar
  nav: {
    brand_subtitle: string;
    community_feed: string;
    find_professionals: string;
    customer_hub: string;
    pro_workspace: string;
    my_requests: string;
    dashboard_inbox: string;
    public_profile_preview: string;
    wallet: string;
    account: string;
    notifications: string;
    profile_settings: string;
    django_admin: string;
    get_started: string;
    sign_in: string;
    join_as_customer: string;
    join_as_pro: string;
    sign_out: string;
    verified_pro: string;
    verification_pending: string;
    role_customer: string;
    role_pro: string;
    role_admin: string;
    switch_language: string;
    language: string;
    light_mode: string;
    dark_mode: string;
    toggle_theme: string;
    theme: string;
    signed_in_as: string;
  };

  // Common Labels
  common: {
    loading: string;
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    search: string;
    filter: string;
    clear: string;
    all: string;
    submit: string;
    submitting: string;
    confirm: string;
    success: string;
    error: string;
    required: string;
    optional: string;
    actions: string;
    date: string;
    status: string;
    phone: string;
    email: string;
    city: string;
    subcity: string;
    address: string;
    view_details: string;
    view_all: string;
    jobs: string;
    years: string;
    rating: string;
    reviews: string;
    remove: string;
    change: string;
  };

  // Statuses
  status: {
    pending: string;
    accepted: string;
    in_progress: string;
    completed: string;
    cancelled: string;
    declined: string;
    declined_by_all: string;
    superseded: string;
    approved: string;
    rejected: string;
  };

  // Community Feed
  feed: {
    title: string;
    subtitle: string;
    find_pro_btn: string;
    composer_placeholder: string;
    attach_photo: string;
    publishing: string;
    publish_btn: string;
    loading_feed: string;
    error_loading: string;
    empty_feed_title: string;
    empty_feed_desc: string;
    likes: string;
    like: string;
    liked: string;
    delete_post_confirm: string;
    verified_pro_badge: string;
  };

  // Find Professionals & Search
  search: {
    title: string;
    subtitle: string;
    search_placeholder: string;
    filter_category: string;
    all_categories: string;
    filter_city: string;
    all_cities: string;
    filter_subcity: string;
    all_subcities: string;
    min_rating: string;
    clear_filters: string;
    selection_banner_title: string;
    selection_banner_desc: string;
    clear_selection: string;
    notify_selected_btn: string;
    loading_pros: string;
    error_loading: string;
    empty_title: string;
    empty_desc: string;
    completed_jobs_count: string;
    experience_yrs: string;
    view_profile: string;
    select_pro: string;
    selected_pro: string;
    request_service_btn: string;
  };

  // Request Service Modal & Work Request
  request: {
    modal_title: string;
    modal_subtitle: string;
    recipients_label: string;
    title_label: string;
    title_placeholder: string;
    desc_label: string;
    desc_placeholder: string;
    address_label: string;
    address_placeholder: string;
    date_label: string;
    date_optional: string;
    submit_request_btn: string;
    submitting_request: string;
    success_created: string;
    limit_warning: string;
    customer_only_warning: string;
    detail_heading: string;
    not_accessible_title: string;
    not_accessible_desc: string;
    problem_desc_title: string;
    location_title: string;
    specific_address_label: string;
    address_confidential_notice: string;
    contact_details_title: string;
    assigned_pro_label: string;
    awaiting_acceptance: string;
    customer_identity_label: string;
    customer_phone_label: string;
    phone_confidential_notice: string;
    notified_pros_title: string;
    accept_btn: string;
    decline_btn: string;
    start_job_btn: string;
    complete_job_btn: string;
    cancel_request_btn: string;
    rate_review_btn: string;
    cancel_modal_title: string;
    cancel_reason_label: string;
    cancel_reason_placeholder: string;
    confirm_cancel_btn: string;
    rating_modal_title: string;
    rating_modal_subtitle: string;
    rating_score_label: string;
    rating_comment_label: string;
    rating_comment_placeholder: string;
    submit_review_btn: string;
    cannot_request_self: string;
    self_review_error: string;
  };

  // Customer Dashboard
  cust_dashboard: {
    welcome: string;
    subtitle: string;
    find_pro_btn: string;
    guide_title: string;
    step1_title: string;
    step1_desc: string;
    step2_title: string;
    step2_desc: string;
    step3_title: string;
    step3_desc: string;
    step4_title: string;
    step4_desc: string;
    section_title: string;
    tab_all: string;
    tab_active: string;
    tab_completed: string;
    tab_cancelled: string;
    loading_requests: string;
    empty_title: string;
    empty_desc: string;
    search_btn: string;
    pro_label: string;
  };

  // Professional Dashboard & Workspace
  pro_dashboard: {
    workspace_title: string;
    welcome_back: string;
    workspace_desc: string;
    view_public_btn: string;
    verification_approved_title: string;
    verification_approved_desc: string;
    verification_pending_title: string;
    verification_pending_desc: string;
    verification_rejected_title: string;
    verification_rejected_desc: string;
    resubmit_cert_btn: string;
    stat_pending: string;
    stat_completed: string;
    stat_rating: string;
    stat_experience: string;
    tab_inbox: string;
    tab_portfolio: string;
    tab_certificate: string;
    inbox_heading: string;
    filter_pending: string;
    filter_active: string;
    filter_completed: string;
    empty_inbox_title: string;
    empty_inbox_desc: string;
    customer_label: string;
    add_portfolio_btn: string;
    portfolio_title_label: string;
    portfolio_desc_label: string;
    portfolio_image_label: string;
    upload_portfolio_btn: string;
    uploading_btn: string;
    no_portfolio: string;
    cert_heading: string;
    cert_title_label: string;
    cert_authority_label: string;
    cert_file_label: string;
    resubmit_submit_btn: string;
    delete_portfolio_confirm: string;
  };

  // Professional Public Detail Page
  pro_detail: {
    not_found_title: string;
    not_found_desc: string;
    back_to_search: string;
    request_service_btn: string;
    verified_pro_badge: string;
    jobs_completed: string;
    about_pro: string;
    service_coverage: string;
    portfolio_heading: string;
    no_portfolio: string;
    reviews_heading: string;
    no_reviews: string;
    standards_heading: string;
    standard1_title: string;
    standard1_desc: string;
    standard2_title: string;
    standard2_desc: string;
    standard3_title: string;
    standard3_desc: string;
    customer_role: string;
  };

  // User Profile & Settings
  profile: {
    title: string;
    tab_info: string;
    tab_security: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    city: string;
    subcity: string;
    saved_address: string;
    saved_address_placeholder: string;
    service_area: string;
    service_area_placeholder: string;
    bio: string;
    bio_placeholder: string;
    photo_label: string;
    photo_desc: string;
    save_btn: string;
    saving_btn: string;
    update_success: string;
    current_password: string;
    new_password: string;
    confirm_password: string;
    change_password_btn: string;
    password_success: string;
    sign_out_btn: string;
  };

  // Authentication & Registration
  auth: {
    sign_in_title: string;
    sign_in_subtitle: string;
    username_or_phone: string;
    username_placeholder: string;
    password: string;
    password_placeholder: string;
    sign_in_btn: string;
    signing_in: string;
    no_account: string;
    register_customer_link: string;
    register_pro_link: string;
    demo_credentials_title: string;
    customer_demo: string;
    pro_demo: string;
    admin_demo: string;
    click_to_fill: string;

    cust_reg_title: string;
    cust_reg_subtitle: string;
    photo_required_label: string;
    photo_required_desc: string;
    select_photo_btn: string;
    change_photo_btn: string;
    photo_verified: string;
    photo_error_required: string;
    photo_error_size: string;
    photo_error_type: string;
    first_name_placeholder: string;
    last_name_placeholder: string;
    unique_username_placeholder: string;
    ethiopian_phone_placeholder: string;
    select_city: string;
    select_subcity: string;
    address_details_optional: string;
    fayda_title: string;
    fayda_desc: string;
    fayda_placeholder: string;
    password_min_length: string;
    confirm_password_placeholder: string;
    complete_cust_reg_btn: string;
    already_registered: string;

    pro_reg_title: string;
    pro_reg_subtitle: string;
    select_trade_categories: string;
    trade_categories_desc: string;
    experience_years_label: string;
    service_area_label: string;
    service_area_placeholder: string;
    pro_bio_label: string;
    pro_bio_placeholder: string;
    mandatory_cert_title: string;
    mandatory_cert_desc: string;
    cert_title_label: string;
    cert_title_placeholder: string;
    issuing_auth_label: string;
    issuing_auth_placeholder: string;
    upload_doc_label: string;
    complete_pro_reg_btn: string;
    err_password_match: string;
    err_password_length: string;
    err_phone_invalid: string;
    err_select_category: string;
    err_cert_required: string;
    err_cert_title_required: string;
  };

  // Notifications
  notifications: {
    center_title: string;
    center_subtitle: string;
    filter_all: string;
    filter_unread: string;
    mark_all_read: string;
    empty_center: string;
    unread_badge: string;
    loading: string;
    view_all_link: string;
  };

  // Modals & Banned
  banned: {
    title: string;
    reason_label: string;
    notice: string;
    support_contact: string;
    close_btn: string;
  };

  // Professional Wallet & Chapa Payment
  wallet: {
    page_title: string;
    page_subtitle: string;
    current_balance: string;
    currency_label: string;
    top_up_btn: string;
    refresh_btn: string;
    transactions_title: string;
    transactions_subtitle: string;
    filter_all: string;
    filter_topups: string;
    filter_fees: string;
    empty_transactions: string;
    empty_transactions_sub: string;
    table_date: string;
    table_type: string;
    table_reference: string;
    table_amount: string;
    table_balance_after: string;
    table_status: string;
    table_actions: string;
    type_topup: string;
    type_fee: string;
    status_success: string;
    status_pending: string;
    status_failed: string;
    status_cancelled: string;
    view_receipt: string;
    download_html: string;
    print_receipt: string;
    topup_modal_title: string;
    topup_modal_desc: string;
    preset_amounts: string;
    custom_amount_label: string;
    custom_amount_placeholder: string;
    proceed_to_checkout: string;
    initiating_payment: string;
    acceptance_fee_notice: string;
    insufficient_funds_title: string;
    insufficient_funds_desc: string;
    top_up_now: string;
    receipt_modal_title: string;
    receipt_number: string;
    pro_name: string;
    phone_number: string;
    gateway_method: string;
    merchant_ref: string;
    chapa_ref: string;
    verified_amount: string;
    receipt_note: string;
    verifying_payment: string;
    payment_verified_success: string;
    payment_verification_failed: string;
  };

  // Support AI Chatbot
  support: {
    widget_title: string;
    widget_badge: string;
    welcome_title: string;
    welcome_message: string;
    input_placeholder: string;
    send_button: string;
    close_button: string;
    clear_chat: string;
    suggest_wallet: string;
    suggest_fee: string;
    suggest_request: string;
    suggest_profile: string;
    thinking: string;
    open_support: string;
    character_count: string;
    disclaimer: string;
    error_generic: string;
    network_error: string;
  };
}
