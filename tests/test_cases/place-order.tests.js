const when = require('../steps/when')
const given = require('../steps/given')
const tearDown = require('../steps/tearDown')
const { init } = require('../steps/init')
const AWS = require('aws-sdk')
console.log = jest.fn()

// Unlike our other tests, this one mocks the service instead of really integrating with the live service.  See Yan's article (bookmarked) for how to poll EventBridge.  Also works similarly for SNS and Kinesis.

const mockPutEvents = jest.fn()
AWS.EventBridge.prototype.putEvents = mockPutEvents

describe('Given an authenticated user', () => {
  let user

  beforeAll(async () => {
    await init()
    user = await given.an_authenticated_user()
  })

  afterAll(async () => {
    await tearDown.an_authenticated_user()
  })

  describe(`When we invoke the POST /orders endpoint`, () => {
    let resp

    beforeAll(async () => {
      mockPutEvents.mockClear()
      mockPutEvents.mockReturnValue({
        promise: async () => {}
      })

      resp = await when.we_invoke_place_order(user, 'Fangtasia')
    })

    it(`Should return 200`, async () => {
      expect(resp.statusCode).toEqual(200)
    })

    if (process.env.TEST_MODE === 'handler') {
      it(`Should publish a message to EventBridge bus`, async () => {
        expect(mockPutEvents).toBeCalledWith({
          Entries: [
            expect.objectContaining({
              Source: 'big-mouth',
              DetailType: 'order_placed',
              Detail: expect.stringContaining(`"restaurantName":"Fangtasia"`),
              EventBusName: expect.stringMatching(process.env.bus_name)
            })
          ]
        })
      })
    }
  })
})