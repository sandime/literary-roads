// Shared constants for all Journey planner screens.
// Centralises category config and type→icon mapping so adding a new stop
// type (e.g. ghostTown) only requires a change in one place.
import {
  BookIcon, LibrariesIcon, LiteraryLandmarkIcon, DriveInTheaterIcon,
  CoffeeCupIcon, RestaurantsIcon, MuseumsIcon, ParksIcon,
  HistoricSitesIcon, ArtGalleriesIcon, ObservatoriesIcon, AquariumsIcon,
  LivePerformanceIcon, FestivalTentIcon,
} from '../Icons';

export const CATEGORY_GROUPS = [
  {
    id: 'literary', Icon: BookIcon, label: 'LITERARY STOPS',
    items: [
      { key: 'bookstore',    Icon: BookIcon,             label: 'Bookstores'         },
      { key: 'library',      Icon: LibrariesIcon,        label: 'Libraries'          },
      { key: 'landmark',     Icon: LiteraryLandmarkIcon, label: 'Literary Landmarks' },
      { key: 'drivein',      Icon: DriveInTheaterIcon,   label: 'Drive-in Theaters'  },
    ],
  },
  {
    id: 'food', Icon: CoffeeCupIcon, label: 'FOOD & DRINK',
    items: [
      { key: 'cafe',         Icon: CoffeeCupIcon,        label: 'Coffee Shops'       },
      { key: 'restaurant',   Icon: RestaurantsIcon,      label: 'Restaurants'        },
    ],
  },
  {
    id: 'attractions', Icon: ArtGalleriesIcon, label: 'ATTRACTIONS',
    items: [
      { key: 'museum',       Icon: MuseumsIcon,          label: 'Museums'            },
      { key: 'park',         Icon: ParksIcon,            label: 'Parks'              },
      { key: 'historicSite', Icon: HistoricSitesIcon,    label: 'Historic Sites'     },
      { key: 'artGallery',   Icon: ArtGalleriesIcon,     label: 'Art Galleries'      },
      { key: 'observatory',  Icon: ObservatoriesIcon,    label: 'Observatories'      },
      { key: 'aquarium',     Icon: AquariumsIcon,        label: 'Aquariums'          },
      { key: 'theater',      Icon: LivePerformanceIcon,  label: 'Theaters'           },
    ],
  },
];

export const CATEGORY_OPTIONS = CATEGORY_GROUPS.flatMap(g => g.items);
export const ALL_CATEGORIES   = new Set(CATEGORY_OPTIONS.map(c => c.key));

export const TYPE_ICON = {
  bookstore:    BookIcon,
  library:      LibrariesIcon,
  cafe:         CoffeeCupIcon,
  landmark:     LiteraryLandmarkIcon,
  drivein:      DriveInTheaterIcon,
  museum:       MuseumsIcon,
  artGallery:   ArtGalleriesIcon,
  park:         ParksIcon,
  restaurant:   RestaurantsIcon,
  observatory:  ObservatoriesIcon,
  historicSite: HistoricSitesIcon,
  aquarium:     AquariumsIcon,
  theater:      LivePerformanceIcon,
  festival:     FestivalTentIcon,
};
