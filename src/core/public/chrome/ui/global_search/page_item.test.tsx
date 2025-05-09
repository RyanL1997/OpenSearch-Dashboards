/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { GlobalSearchPageItem } from './page_item';
import { coreMock } from '../../../../../core/public/mocks';
import {
  ChromeNavLink,
  ChromeRegistrationNavLink,
  NavGroupItemInMap,
} from 'opensearch-dashboards/public';

import { NavGroupType } from '../../../../../core/public';

describe('PageItem', () => {
  const currentWorkspace = {
    id: 'foo',
    name: 'Workspace 1',
  };

  const link = {
    id: 'appId',
    title: 'App 1',
    navGroup: {
      title: 'Essential',
      type: undefined,
      description: '',
    },
    category: {
      id: 'observability',
      label: 'Observability',
    },
  } as ChromeRegistrationNavLink & ChromeNavLink & { navGroup: NavGroupItemInMap };

  const coreStartMock = coreMock.createStart();
  const { application } = coreStartMock;

  const assignMock = jest.fn();

  // Mock window.location.assign
  Object.defineProperty(window, 'location', {
    value: {
      assign: assignMock,
    },
    writable: true,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page item correctly', () => {
    const { getByText } = render(<GlobalSearchPageItem link={link} search="abc" />);

    expect(getByText('App 1')).toBeInTheDocument();
  });

  it('renders the page item with parent link correctly', () => {
    const linkWithParentLink = {
      ...link,
      parentNavLinkId: 'settings',
      navGroup: {
        id: 'admin',
        description: '',
        title: 'Data administration',
        type: NavGroupType.SYSTEM,
        navLinks: [
          {
            id: 'settings',
            description: '',
            title: 'Settings',
            type: NavGroupType.SYSTEM,
          },
        ],
      },
    };
    const { getByText } = render(<GlobalSearchPageItem link={linkWithParentLink} search="abc" />);

    expect(getByText('Settings')).toBeInTheDocument();
    expect(getByText('App 1')).toBeInTheDocument();
  });

  it('renders the page item correctly for non workspace pages', () => {
    const settingsLink = {
      ...link,
      navGroup: {
        id: 'settings',
        title: 'Settings',
        description: 'Settings',
        type: NavGroupType.SYSTEM,
        navLinks: [],
      },
    };
    const { getByText } = render(
      <GlobalSearchPageItem
        link={settingsLink}
        search="abc"
        renderBreadcrumbs={(breadcrumbs) => {
          breadcrumbs.push({ text: <>{settingsLink.navGroup.title}</> });
          return breadcrumbs;
        }}
      />
    );

    // workspace name and link title
    expect(getByText('Settings')).toBeInTheDocument();
    expect(getByText('App 1')).toBeInTheDocument();
  });

  it('renders the page item correctly for non workspace landing page', () => {
    const settingsLink = {
      ...link,
      navGroup: {
        id: 'settings',
        title: 'Settings',
        description: 'Settings',
        type: NavGroupType.SYSTEM,
        navLinks: [],
      },
      id: 'app_landing',
      title: 'Overview',
    };

    const { getByText } = render(
      <GlobalSearchPageItem
        link={settingsLink}
        search="abc"
        renderBreadcrumbs={(breadcrumbs) => {
          breadcrumbs.push({ text: <>{settingsLink.navGroup.title}</> });
          return breadcrumbs;
        }}
      />
    );

    // nav group title and page title
    expect(getByText('Settings')).toBeInTheDocument();
    expect(getByText('Settings Overview')).toBeInTheDocument();
  });

  it('renders the page item correctly for non workspace overview page', () => {
    const settingsLink = {
      ...link,
      category: { label: 'Security Analytics', id: 'sa' },
      id: 'sa_overview',
      title: 'Overview',
    };

    const { getByText } = render(
      <GlobalSearchPageItem
        link={settingsLink}
        search="abc"
        renderBreadcrumbs={(breadcrumbs) => {
          breadcrumbs.push({ text: <>{currentWorkspace.name}</> });
          return breadcrumbs;
        }}
      />
    );

    // workspace name and link title
    expect(getByText('Workspace 1')).toBeInTheDocument();
    expect(getByText('Security Analytics')).toBeInTheDocument();
    expect(getByText('Overview')).toBeInTheDocument();
  });

  it('click on the item will navigate to corresponding page', () => {
    const settingsLink = {
      ...link,
      category: { label: 'Security Analytics', id: 'sa' },
      id: 'sa_overview',
      title: 'Overview',
    };

    const { getByText, getByTestId } = render(
      <GlobalSearchPageItem
        link={settingsLink}
        search="abc"
        renderBreadcrumbs={(breadcrumbs) => {
          breadcrumbs.push({ text: <>{currentWorkspace.name}</> });
          return breadcrumbs;
        }}
        callback={() => application.navigateToApp(settingsLink.id)}
      />
    );

    // workspace name and link title
    expect(getByText('Workspace 1')).toBeInTheDocument();
    expect(getByText('Security Analytics')).toBeInTheDocument();
    expect(getByText('Overview')).toBeInTheDocument();

    fireEvent.click(getByTestId('global-search-item-sa_overview'));
    expect(application.navigateToApp).toBeCalledWith('sa_overview');
  });

  it('click on the item will navigate to correctly page for data source out of workspace', () => {
    const navLink = {
      ...link,
      href: 'http://localhost:5601/w/foo/app/data_source',
      navGroup: {
        id: 'admin',
        description: '',
        title: 'Data administration',
        type: NavGroupType.SYSTEM,
        navLinks: [],
      },
      id: 'data_source',
      title: 'Data source',
    };

    const { getByText, getByTestId } = render(
      <GlobalSearchPageItem
        link={navLink}
        search="abc"
        renderBreadcrumbs={(breadcrumbs) => {
          breadcrumbs.push({ text: <>{navLink.navGroup.title}</> });
          return breadcrumbs;
        }}
        callback={() => {
          window.location.assign('http://localhost:5601/app/data_source');
        }}
      />
    );

    expect(getByText('Data administration')).toBeInTheDocument();
    expect(getByText('Data source')).toBeInTheDocument();

    fireEvent.click(getByTestId('global-search-item-data_source'));
    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith('http://localhost:5601/app/data_source');
  });

  it('click on the item will navigate to correctly page for data source in a workspace', () => {
    const navLink = {
      ...link,
      href: 'http://localhost:5601/w/foo/app/data_source',
      navGroup: {
        id: 'sa',
        description: '',
        title: 'Security Analytics',
        navLinks: [],
      },
      id: 'data_source',
      title: 'Data source',
    };

    const { getByText, getByTestId } = render(
      <GlobalSearchPageItem
        link={navLink}
        search="abc"
        callback={() => application.navigateToApp('data_source')}
      />
    );

    expect(getByText('Data source')).toBeInTheDocument();

    fireEvent.click(getByTestId('global-search-item-data_source'));
    expect(application.navigateToApp).toBeCalledWith('data_source');
  });
});
